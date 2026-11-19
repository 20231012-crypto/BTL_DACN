import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { openDatabase, camel } from './repositories/database.js';
import { openPostgres } from './repositories/postgres.js';
import { seedDatabase } from './repositories/seed.js';
import {
  assert,
  getSettings,
  getProduct,
  productList,
} from './services/shared.js';
import { installAuth } from './services/auth.js';
import { installOrders, expireOrders } from './services/orders.js';
import { installAdmin } from './services/admin.js';
import { installBackup } from './services/backup.js';
import { installChatbot } from './services/chatbot.js';
import { installConsultation } from './services/consultation.js';
import { installReturnGoods } from './services/return-goods.js';
import {
  installUploadIntents,
  supabaseStorage,
} from './services/attachments.js';
import { googleConfig } from './integrations/google.js';
import { vnpayConfig } from './integrations/vnpay.js';
import { installLocations } from './integrations/locations.js';
import { geminiKeys } from './integrations/gemini-client.js';
import { bankTransferConfig, installBankTransfers } from './services/bank-transfer.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function createApp(options = {}) {
  const hosted =
    options.hosted ?? (!options.testing && process.env.VERCEL === '1');
  const databaseUrl =
    options.databaseUrl ?? (options.dbPath ? '' : process.env.DATABASE_URL);
  if (hosted && !databaseUrl)
    throw new Error('Cần DATABASE_URL để chạy trên Vercel.');
  const defaultOrigin =
    hosted && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://127.0.0.1:${process.env.PORT || 3001}`;
  const origin = new URL(process.env.APP_ORIGIN || defaultOrigin).origin;
  const config = {
    hosted,
    testing: !!options.testing,
    demo:
      !hosted &&
      (!databaseUrl || options.testing) &&
      (options.demo ??
        (process.env.NODE_ENV !== 'production' &&
          process.env.DEMO_MODE !== 'false')),
    storagePath: options.storagePath || process.env.PRESCRIPTIONS_PATH,
    attachmentStorage:
      options.attachmentStorage ?? (databaseUrl ? supabaseStorage() : null),
    origin,
    secureCookies:
      hosted ||
      process.env.NODE_ENV === 'production' ||
      origin.startsWith('https:'),
    google: googleConfig(origin),
    vnpay: options.vnpay ?? vnpayConfig(origin),
    bankTransfer: options.bankTransfer ?? bankTransferConfig(),
  };
  if (hosted && !config.attachmentStorage)
    throw new Error('Cần Supabase Storage riêng tư để chạy trên Vercel.');
  const d = databaseUrl
    ? openPostgres(databaseUrl)
    : openDatabase(options.dbPath || process.env.DATABASE_PATH);
  try {
    // Kiểm tra bucket riêng tư và cơ sở dữ liệu chạy song song để rút ngắn khởi động nguội.
    await Promise.all([
      config.attachmentStorage?.check(),
      (async () => {
        if (d.kind === 'sqlite' || (options.testing && options.seed !== false)) {
          await seedDatabase(d, {
            demoData:
              options.seed !== false &&
              process.env.SEED_DEMO !== 'false' &&
              config.demo,
          });
        } else {
          const initialized = await d.one(
            "SELECT value FROM settings WHERE key='storeName'",
          );
          if (!initialized)
            throw new Error(
              'Chạy npm run db:setup trước khi khởi động PostgreSQL.',
            );
        }
      })(),
    ]);
  } catch (error) {
    await d.close();
    throw error;
  }
  const app = express();
  app.disable('x-powered-by');
  app.locals.store = d;
  app.locals.config = config;
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    next();
  });
  // Dữ liệu công khai, không phụ thuộc người dùng: cho phép CDN lưu ngắn hạn để tải lại trang nhanh hơn.
  const edgeCache = (seconds, staleSeconds) => (req, res, next) => {
    res.set(
      'Cache-Control',
      `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
    );
    next();
  };
  app.use(
    express.json({
      limit: hosted ? '4mb' : '20mb',
    }),
  );
  app.use(cookieParser());
  const origins = new Set([
    origin,
    ...(hosted
      ? [defaultOrigin]
      : [
          'http://localhost:5173',
          'http://localhost:3001',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3001',
        ]),
  ]);
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('Origin');
      assert(
        !origin || origins.has(origin),
        403,
        'Nguồn yêu cầu không được phép.',
      );
      assert(
        req.get('Sec-Fetch-Site') !== 'cross-site',
        403,
        'Không chấp nhận yêu cầu từ website khác.',
      );
    }
    next();
  });
  const limits = new Map();
  app.use('/api', (req, res, next) => {
    if (config.testing) return next();
    const forwarded = hosted ? req.get('x-vercel-forwarded-for') || '' : '';
    const clientIp = isIP(forwarded) ? forwarded : req.ip;
    const authRoute = req.path.startsWith('/auth'),
      key = `${clientIp}:${authRoute ? 'auth' : req.path.startsWith('/chat') ? 'chat' : 'api'}`,
      window = authRoute ? 15 * 60000 : 60000,
      max = authRoute ? 40 : req.path.startsWith('/chat') ? 60 : 600,
      time = Date.now();
    let bucket = limits.get(key);
    if (!bucket || time - bucket.start > window) {
      bucket = { start: time, count: 0 };
      limits.set(key, bucket);
    }
    bucket.count++;
    if (limits.size > 10000)
      for (const [k, b] of limits)
        if (time - b.start > 15 * 60000) limits.delete(k);
    assert(
      bucket.count <= max,
      429,
      'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    );
    next();
  });
  let lastExpire = 0;
  app.use('/api', async (req, res, next) => {
    if (Date.now() - lastExpire > 60000) {
      lastExpire = Date.now();
      await expireOrders(d);
    }
    next();
  });
  const guards = installAuth(app, d, config);
  app.get('/favicon.ico', (req, res) => {
    const p = existsSync(path.join(root, 'dist/favicon.ico'))
      ? path.join(root, 'dist/favicon.ico')
      : path.join(root, 'frontend/public/favicon.ico');
    res.type('image/x-icon').sendFile(p);
  });
  app.get('/favicon.svg', (req, res) => {
    const p = existsSync(path.join(root, 'dist/favicon.svg'))
      ? path.join(root, 'dist/favicon.svg')
      : path.join(root, 'frontend/public/favicon.svg');
    res.type('image/svg+xml').sendFile(p);
  });
  app.get(['/favicon.png', '/apple-touch-icon.png'], (req, res) => {
    const p = existsSync(path.join(root, 'dist/favicon.png'))
      ? path.join(root, 'dist/favicon.png')
      : path.join(root, 'frontend/public/favicon.png');
    res.type('image/png').sendFile(p);
  });
  app.get('/api/health', (req, res) =>
    res.json({
      data: {
        status: 'ok',
        name: 'Nhà thuốc An Tâm',
        database: d.kind,
        demoMode: config.demo,
        geminiConfigured: geminiKeys().length > 0,
      },
    }),
  );
  app.get('/api/config', edgeCache(60, 300), async (req, res) => {
    const s = await getSettings(d);
    res.json({
      data: {
        storeName: s.storeName,
        shippingFee: s.shippingFee,
        freeShippingThreshold: s.freeShippingThreshold,
        demoMode: config.demo,
        chatbotEnabled: s.chatbotEnabled,
        otpMode: config.demo ? 'demo' : 'email',
        googleConfigured: Boolean(config.google),
        prescriptionReadingConfigured: geminiKeys().length > 0,
        uploadMode: config.attachmentStorage ? 'signed' : 'multipart',
        paymentProvider: config.vnpay ? 'vnpay' : config.demo ? 'demo' : 'cod',
        paymentMethods: [
          'cod',
          ...(config.demo ? ['demo'] : []),
          ...(config.vnpay ? ['vnpay'] : []),
          ...(config.bankTransfer ? ['bank_transfer'] : []),
        ],
      },
    });
  });
  app.get('/api/products', edgeCache(30, 120), async (req, res) =>
    res.json({
      data: await productList(d, req.query),
    }),
  );
  app.get('/api/products/suggestions', async (req, res) => {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';
    const category =
      typeof req.query.category === 'string'
        ? req.query.category.trim().slice(0, 60)
        : '';
    const prescription =
      typeof req.query.prescription === 'string'
        ? req.query.prescription
        : 'false';
    const hasFilter = Boolean(search || category || prescription === 'true');
    const products = hasFilter
      ? await productList(d, { search, category, prescription })
      : [];
    res.json({
      data: products
        .slice(0, 8)
        .map(
          ({
            id,
            name,
            ingredient,
            prescriptionRequired,
            price,
            unit,
            image,
            categoryName,
            stock,
          }) => ({
            id,
            name,
            ingredient,
            prescriptionRequired,
            price,
            unit,
            image,
            categoryName,
            stock,
          }),
        ),
    });
  });
  app.get('/api/products/:id', async (req, res) => {
    let product = await getProduct(d, req.params.id);
    if (!product) {
      const row = await d.one(
        'SELECT id FROM thuoc WHERE slug=?',
        req.params.id,
      );
      if (row) product = await getProduct(d, row.id);
    }
    assert(product, 404, 'Không tìm thấy sản phẩm.');
    const reviews = (
      await d.all(
        'SELECT r.id,r.rating,r.comment,r.created_at,u.name user_name FROM danh_gia r JOIN nguoi_dung u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.id DESC',
        product.id,
      )
    ).map(camel);
    res.json({ data: { ...product, reviews } });
  });
  app.get('/api/categories', edgeCache(120, 600), async (req, res) =>
    res.json({
      data: (
        await d.all('SELECT * FROM danh_muc WHERE active=1 ORDER BY id')
      ).map(camel),
    }),
  );
  app.get('/api/manufacturers', edgeCache(120, 600), async (req, res) =>
    res.json({
      data: (
        await d.all('SELECT * FROM nha_san_xuat WHERE active=1 ORDER BY name')
      ).map(camel),
    }),
  );
  installOrders(app, d, guards, config);
  installBankTransfers(app, d, guards, config.bankTransfer);
  installLocations(app);
  installUploadIntents(app, d, guards.auth, config.attachmentStorage);
  installAdmin(app, d, guards, config);
  installBackup(app, d, guards);
  installChatbot(app, d, guards, config);
  installConsultation(app, d, guards);
  installReturnGoods(app, d, guards);
  app.use('/api', (req, res) =>
    res.status(404).json({ error: 'API không tồn tại.' }),
  );
  if (!hosted && existsSync(path.join(root, 'dist/index.html'))) {
    app.use(express.static(path.join(root, 'dist')));
    app.get('/{*path}', (req, res) =>
      res.sendFile(path.join(root, 'dist/index.html')),
    );
  }
  app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'Tệp đính kèm tối đa 5 MB.' });
    if (error instanceof SyntaxError && error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Dữ liệu JSON không hợp lệ.' });
    if (
      error.code?.startsWith('SQLITE_CONSTRAINT') ||
      ['23503', '23505', '23514'].includes(error.code)
    )
      return res.status(409).json({
        error: 'Dữ liệu trùng hoặc vi phạm ràng buộc. Vui lòng kiểm tra lại.',
      });
    if (error.code === '22P02')
      return res.status(400).json({ error: 'Định dạng dữ liệu không hợp lệ.' });
    const status = error.status || 500;
    if (status >= 500 && !config.testing)
      console.error(
        `[${new Date().toISOString()}] ${req.method} ${req.path}: ${hosted ? error.code || status : error.message}`,
      );
    res.status(status).json({
      error:
        status >= 500
          ? 'Hệ thống tạm thời không thể xử lý yêu cầu. Vui lòng thử lại.'
          : error.message,
    });
  });
  return app;
}
