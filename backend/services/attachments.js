import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { now } from '../repositories/database.js';
import { assert, fail, text } from './shared.js';

export const imageMimes = ['image/jpeg', 'image/png'];
export const prescriptionMimes = [...imageMimes, 'application/pdf'];
export const maxFileSize = 5 * 1024 * 1024;
export const validPrescriptionName = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function matchesFile(mime, buffer) {
  if (mime === 'application/pdf')
    return buffer.subarray(0, 5).toString() === '%PDF-';
  if (mime === 'image/png')
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return (
    mime === 'image/jpeg' &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  );
}

export function supabaseStorage() {
  const endpoint = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!endpoint && !key) return null;
  if (!endpoint || !key || new URL(endpoint).protocol !== 'https:')
    throw new Error(
      'Cấu hình SUPABASE_URL và SUPABASE_SECRET_KEY tại máy chủ.',
    );
  const client = createClient(endpoint, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const name = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'minhan-private';
  if (!/^[a-z0-9-]{3,60}$/.test(name))
    throw new Error('Tên bucket đính kèm không hợp lệ.');
  const bucket = client.storage.from(name);
  async function check() {
    const { data, error } = await client.storage.getBucket(name);
    if (error || data?.public !== false)
      throw new Error('Cần bucket Supabase riêng tư để lưu tệp.');
    if (
      Number(data.file_size_limit) !== maxFileSize ||
      !prescriptionMimes.every((mime) =>
        data.allowed_mime_types?.includes(mime),
      )
    ) {
      throw new Error('Đặt giới hạn bucket là 5 MB và cho phép JPG, PNG, PDF.');
    }
  }
  async function setup() {
    const { data } = await client.storage.getBucket(name);
    if (data) return check();
    const { error } = await client.storage.createBucket(name, {
      public: false,
      fileSizeLimit: maxFileSize,
      allowedMimeTypes: prescriptionMimes,
    });
    if (error) throw new Error('Không tạo được bucket Supabase riêng tư.');
    await check();
  }
  return {
    check,
    setup,
    async signUpload(id) {
      const { data, error } = await bucket.createSignedUploadUrl(id, {
        upsert: false,
      });
      assert(!error && data?.signedUrl, 503, 'Chưa thể tạo đường dẫn tải tệp.');
      return data.signedUrl;
    },
    async inspect(id, mime, expectedSize) {
      const { data, error } = await bucket.info(id);
      assert(
        !error && data?.size === expectedSize && data.size <= maxFileSize,
        400,
        'Tệp tải lên chưa đầy đủ hoặc sai dung lượng.',
      );
      const downloaded = await bucket.download(id);
      assert(
        !downloaded.error && downloaded.data?.size === expectedSize,
        400,
        'Chưa đọc được tệp tải lên.',
      );
      return (
        matchesFile(
          mime,
          Buffer.from(await downloaded.data.slice(0, 12).arrayBuffer()),
        ) && downloaded.data.type === mime
      );
    },
    async signedRead(id) {
      const { data, error } = await bucket.createSignedUrl(id, 60);
      assert(!error && data?.signedUrl, 404, 'Không tìm thấy tệp.');
      return data.signedUrl;
    },
    async remove(ids) {
      const { error } = await bucket.remove(ids);
      if (error) fail(503, 'Chưa thể dọn tệp hết hạn.');
    },
  };
}

export function installUploadIntents(app, d, auth, storage) {
  if (!storage) return;
  app.post('/api/uploads/intents', auth, async (req, res) => {
    const { kind, mimeType, size } = req.body ?? {};
    const fileName = text(req.body?.fileName, 200);
    const allowed =
      kind === 'return'
        ? imageMimes
        : kind === 'prescription'
          ? prescriptionMimes
          : [];
    assert(
      allowed.includes(mimeType) &&
        Number.isInteger(size) &&
        size > 0 &&
        size <= maxFileSize &&
        fileName,
      400,
      'Chọn tệp hợp lệ tối đa 5 MB.',
    );
    const id = randomUUID();
    const expired = await d.all(
      'SELECT id FROM upload_intents WHERE user_id=? AND expires_at<=? LIMIT 20',
      req.user.id,
      now(),
    );
    if (expired.length) {
      await storage.remove(expired.map((row) => row.id));
      for (const row of expired)
        await d.run(
          'DELETE FROM upload_intents WHERE id=? AND user_id=?',
          row.id,
          req.user.id,
        );
    }
    await d.transaction(async () => {
      const { count } = await d.one(
        'SELECT COUNT(*) count FROM upload_intents WHERE user_id=?',
        req.user.id,
      );
      assert(count < 8, 429, 'Vui lòng hoàn tất các lượt tải tệp đang chờ.');
      await d.insert('upload_intents', {
        id,
        user_id: req.user.id,
        kind,
        original_name: fileName,
        mime_type: mimeType,
        size,
        // Supabase signed upload tokens remain valid for two hours.
        expires_at: new Date(Date.now() + (2 * 60 + 5) * 60000).toISOString(),
      });
    });
    try {
      const uploadUrl = await storage.signUpload(id);
      res.status(201).json({ data: { uploadId: id, uploadUrl } });
    } catch (error) {
      await d.run(
        'DELETE FROM upload_intents WHERE id=? AND user_id=?',
        id,
        req.user.id,
      );
      throw error;
    }
  });
}

export async function verifyUpload(d, storage, userId, id, kind) {
  assert(validPrescriptionName(id), 400, 'Cần tải tệp lên trước khi tiếp tục.');
  const attachment = await d.one(
    'SELECT * FROM upload_intents WHERE id=? AND user_id=? AND kind=? AND expires_at>?',
    id,
    userId,
    kind,
    now(),
  );
  assert(attachment, 404, 'Không tìm thấy lượt tải tệp của bạn.');
  assert(
    await storage.inspect(id, attachment.mime_type, attachment.size),
    400,
    'Nội dung tệp không đúng định dạng.',
  );
  return attachment;
}

export async function claimUpload(d, attachment) {
  const result = await d.run(
    'DELETE FROM upload_intents WHERE id=? AND user_id=? AND expires_at>?',
    attachment.id,
    attachment.user_id,
    now(),
  );
  assert(
    Number(result.changes) === 1,
    409,
    'Tệp đã được đính kèm hoặc đã hết hạn.',
  );
}
