import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDatabase, camel } from './repositories/database.js';
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
import { googleConfig } from './integrations/google.js';
import { vnpayConfig } from './integrations/vnpay.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp(options = {}) {
  const d = openDatabase(options.dbPath || process.env.DATABASE_PATH);
  const origin = new URL(
    process.env.APP_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3001}`,
  ).origin;
  const config = {
    testing: !!options.testing,
    demo:
      options.demo ??
      (process.env.NODE_ENV !== 'production' &&
        process.env.DEMO_MODE !== 'false'),
    storagePath: options.storagePath || process.env.PRESCRIPTIONS_PATH,
    origin,
    secureCookies:
      process.env.NODE_ENV === 'production' || origin.startsWith('https:'),
    google: googleConfig(origin),
    vnpay: options.vnpay ?? vnpayConfig(origin),
  };
  // Demo seed is explicit in production. Local projects run immediately with reproducible sample data.
  seedDatabase(d, {
    demoData:
      options.seed !== false &&
      process.env.SEED_DEMO !== 'false' &&
      config.demo,
  });
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
  app.use(express.json({ limit: '20mb' }));
  app.use(cookieParser());
  const origins = new Set(
    [
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3001',
      origin,
    ].filter(Boolean),
  );
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
    const authRoute = req.path.startsWith('/auth'),
      key = `${req.ip}:${authRoute ? 'auth' : req.path.startsWith('/chat') ? 'chat' : 'api'}`,
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
  app.use('/api', (req, res, next) => {
    if (Date.now() - lastExpire > 60000) {
      lastExpire = Date.now();
      expireOrders(d);
    }
    next();
  });
  const guards = installAuth(app, d, config);
  app.get('/api/health', (req, res) =>
    res.json({
      data: {
        status: 'ok',
        name: 'Nhà thuốc An Tâm',
        database: 'sqlite',
        demoMode: config.demo,
        geminiConfigured: !!process.env.GEMINI_API_KEY,
      },
    }),
  );
  app.get('/api/config', (req, res) => {
    const s = getSettings(d);
    res.json({
      data: {
        storeName: s.storeName,
        shippingFee: s.shippingFee,
        freeShippingThreshold: s.freeShippingThreshold,
        demoMode: config.demo,
        chatbotEnabled: s.chatbotEnabled,
        otpMode: config.demo ? 'demo' : 'email',
        googleConfigured: Boolean(config.google),
        paymentProvider: config.vnpay ? 'vnpay' : config.demo ? 'demo' : 'cod',
        paymentMethods: [
          'cod',
          ...(config.demo ? ['demo'] : []),
          ...(config.vnpay ? ['vnpay'] : []),
        ],
      },
    });
  });
  app.get('/api/products', (req, res) =>
    res.json({ data: productList(d, req.query) }),
  );
  app.get('/api/products/:id', (req, res) => {
    let product = getProduct(d, req.params.id);
    if (!product) {
      const row = d.one('SELECT id FROM thuoc WHERE slug=?', req.params.id);
      if (row) product = getProduct(d, row.id);
    }
    assert(product, 404, 'Không tìm thấy sản phẩm.');
    const reviews = d
      .all(
        'SELECT r.id,r.rating,r.comment,r.created_at,u.name user_name FROM danh_gia r JOIN nguoi_dung u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.id DESC',
        product.id,
      )
      .map(camel);
    res.json({ data: { ...product, reviews } });
  });
  app.get('/api/categories', (req, res) =>
    res.json({
      data: d
        .all('SELECT * FROM danh_muc WHERE active=1 ORDER BY id')
        .map(camel),
    }),
  );
  app.get('/api/manufacturers', (req, res) =>
    res.json({
      data: d
        .all('SELECT * FROM nha_san_xuat WHERE active=1 ORDER BY name')
        .map(camel),
    }),
  );
  installOrders(app, d, guards, config);
  installAdmin(app, d, guards, config);
  installBackup(app, d, guards);
  installChatbot(app, d, guards, config);
  app.use('/api', (req, res) =>
    res.status(404).json({ error: 'API không tồn tại.' }),
  );
  if (existsSync(path.join(root, 'dist/index.html'))) {
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
    if (error.code?.startsWith('SQLITE_CONSTRAINT'))
      return res.status(409).json({
        error: 'Dữ liệu trùng hoặc vi phạm ràng buộc. Vui lòng kiểm tra lại.',
      });
    const status = error.status || 500;
    if (status >= 500 && !config.testing)
      console.error(
        `[${new Date().toISOString()}] ${req.method} ${req.path}: ${error.message}`,
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
