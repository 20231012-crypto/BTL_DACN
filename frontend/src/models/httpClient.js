/**
 * HTTP client and storage upload primitives for communicating with the backend API.
 */

export async function api(path, options = {}) {
  const headers = { ...options.headers };
  let body = options.body;
  if (body !== undefined && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(
    path.startsWith('/api/') ? path : `/api${path}`,
    { ...options, headers, body, credentials: 'same-origin' },
  );
  const type = response.headers.get('content-type') || '';
  const result = type.includes('json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new Error(
      result.error ||
        result.message ||
        'Không thể thực hiện yêu cầu. Vui lòng thử lại.',
    );
  }
  return result && typeof result === 'object' && 'data' in result
    ? result.data
    : result;
}

export async function uploadToStorage(file, kind) {
  const { uploadId, uploadUrl } = await api('/uploads/intents', {
    method: 'POST',
    body: { kind, fileName: file.name, mimeType: file.type, size: file.size },
  });
  const form = new FormData();
  form.append('cacheControl', '0');
  form.append('', file);
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: form,
    credentials: 'omit',
  });
  if (!uploaded.ok) throw new Error('Chưa tải được tệp. Vui lòng thử lại.');
  return uploadId;
}

export async function uploadPrescription(file, mode) {
  if (!file) throw new Error('Chọn tệp đơn thuốc.');
  if (
    file.size > 5 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
  ) {
    throw new Error('Chọn ảnh JPG, PNG hoặc PDF có dung lượng tối đa 5 MB.');
  }
  if (mode === 'signed') {
    const uploadId = await uploadToStorage(file, 'prescription');
    return api('/prescriptions', { method: 'POST', body: { uploadId } });
  }
  const form = new FormData();
  form.append('file', file);
  return api('/prescriptions', { method: 'POST', body: form });
}
