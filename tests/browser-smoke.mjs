import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../backend/app.js';

const puppeteer = (await import(process.env.PUPPETEER_MODULE || 'puppeteer'))
  .default;
const origin = 'http://127.0.0.1:39117';
process.env.APP_ORIGIN = origin;
const scratch = mkdtempSync(path.join(os.tmpdir(), 'antam-browser-'));
const app = await createApp({
  dbPath: ':memory:',
  storagePath: scratch,
  testing: true,
  demo: true,
});
const server = app.listen(39117, '127.0.0.1');
let browser;
const errors = [];
const artifacts = path.resolve('artifacts');
mkdirSync(artifacts, { recursive: true });

async function openPage(width, height) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: width < 480,
    hasTouch: width < 480,
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url().replace(origin, '')}`);
  });
  page.setDefaultTimeout(9000);
  return page;
}

async function open(page, route, selector) {
  await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
  if (selector) await page.waitForSelector(selector);
}

async function clickText(page, selector, phrase) {
  await page.waitForFunction(
    (sel, text) =>
      [...document.querySelectorAll(sel)].some(
        (element) => element.textContent.trim() === text && !element.disabled,
      ),
    {},
    selector,
    phrase,
  );
  await page.evaluate(
    (sel, text) =>
      [...document.querySelectorAll(sel)]
        .find(
          (element) => element.textContent.trim() === text && !element.disabled,
        )
        .click(),
    selector,
    phrase,
  );
}

async function textOnPage(page, selector, phrase) {
  await page.waitForFunction(
    (sel, text) =>
      [...document.querySelectorAll(sel)].some((element) =>
        element.textContent.includes(text),
      ),
    {},
    selector,
    phrase,
  );
}

async function login(page, role, destination) {
  await open(page, '/login', '.demo-accounts');
  await clickText(page, '.demo-accounts button', role);
  await page.waitForFunction(
    (expected) => location.pathname === expected,
    {},
    destination,
  );
}

async function setField(page, selector, value) {
  const field = await page.waitForSelector(selector);
  await field.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await field.type(value);
}

async function clip(page, name) {
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.equal(size.scroll, size.viewport, `Horizontal overflow on ${name}`);
}

try {
  await new Promise((resolve, reject) => {
    server.on('listening', resolve);
    server.on('error', reject);
  });
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const customer = await openPage(1440, 1000);
  await open(customer, '/', '.product-card');
  await customer.waitForFunction(
    () => document.querySelector('.hero-photo img').naturalWidth > 0,
  );
  assert.equal(
    await customer.$$('.product-card').then((cards) => cards.length),
    8,
  );
  await clip(customer, 'storefront-desktop');
  const mobile = await openPage(390, 844);
  await open(mobile, '/', '.product-card');
  await clip(mobile, 'storefront-mobile');
  await open(mobile, '/products?search=nuoc%20muoi', '.product-card');
  await textOnPage(mobile, '.product-name', 'Nước muối');
  await clip(mobile, 'catalog-mobile');
  console.log(
    'PASS public catalog, accent-insensitive search, desktop and mobile layouts',
  );

  await login(customer, 'Khách hàng', '/');
  await open(customer, '/products?search=amoxicillin', '.product-card');
  await clickText(customer, '.product-add', 'Thêm vào giỏ');
  await textOnPage(customer, '.toast', 'Đã thêm sản phẩm');
  await open(customer, '/checkout', '.payment-option');
  await customer.waitForSelector('.address-option.selected');
  const rxFile = path.join(scratch, 'don-thuoc-mau.png');
  writeFileSync(
    rxFile,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X35sAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  await (await customer.$('input[type=file]')).uploadFile(rxFile);
  await textOnPage(customer, '.upload-zone.uploaded', 'don-thuoc-mau.png');
  await clickText(
    customer,
    '.payment-option strong',
    'Thanh toán trực tuyến mô phỏng',
  );
  await clip(customer, 'checkout-desktop');
  await clickText(customer, 'button[type=submit]', 'Đặt hàng');
  await customer.waitForFunction(() =>
    /^\/orders\/\d+$/.test(location.pathname),
  );
  await textOnPage(customer, '.order-title .badge', 'Chờ duyệt đơn thuốc');
  const orderPath = new URL(customer.url()).pathname;
  const orderCode = await customer.$eval('.order-title h1', (element) =>
    element.textContent.trim(),
  );
  assert.equal(await customer.$('.demo-payment'), null);
  console.log(
    'PASS signed-in checkout, private prescription upload and payment gate',
  );

  const pharmacy = await openPage(1440, 1000);
  await login(pharmacy, 'Dược sĩ', '/admin');
  await clickText(pharmacy, '.adm-sidebar nav button', 'Duyệt đơn thuốc');
  await textOnPage(pharmacy, '.adm-table tr', orderCode);
  await clickText(pharmacy, '.adm-table tr button', 'Kiểm tra');
  await textOnPage(pharmacy, '[role=dialog] strong', 'Amoxicillin');
  await pharmacy.select('[role=dialog] select[name=status]', 'approved');
  await clickText(
    pharmacy,
    '[role=dialog] button[type=submit]',
    'Lưu kết quả kiểm duyệt',
  );
  await pharmacy.waitForFunction(
    () => !document.querySelector('[role=dialog]'),
  );
  await clickText(customer, '.order-title button', 'Cập nhật trạng thái');
  await textOnPage(customer, '.order-title .badge', 'Chờ thanh toán');
  await clickText(customer, '.demo-payment button', 'Mô phỏng thất bại');
  await textOnPage(
    customer,
    '.order-summary .error-box',
    'Thanh toán chưa thành công',
  );
  await clickText(customer, '.demo-payment button', 'Mô phỏng thành công');
  await textOnPage(customer, '.order-summary .badge', 'Đã thanh toán');

  await clickText(pharmacy, '.adm-sidebar nav button', 'Đơn hàng');
  for (const [state, title] of [
    ['confirmed', 'Đã xác nhận'],
    ['packing', 'Đang đóng gói'],
    ['shipping', 'Đang giao'],
    ['delivered', 'Đã giao'],
  ]) {
    await clickText(pharmacy, '.adm-table .adm-code', orderCode);
    await pharmacy.waitForSelector('[role=dialog] select[name=nextStatus]');
    await pharmacy.select('[role=dialog] select[name=nextStatus]', state);
    await clickText(
      pharmacy,
      '[role=dialog] button[type=submit]',
      'Cập nhật đơn hàng',
    );
    await pharmacy.waitForFunction(
      () => !document.querySelector('[role=dialog]'),
    );
    await textOnPage(pharmacy, '.adm-table tr', title);
  }
  await open(customer, orderPath, '.order-item');
  await clickText(customer, '.order-item button', 'Đánh giá');
  await setField(
    customer,
    '[role=dialog] textarea',
    'Đã nhận sản phẩm và đóng gói cẩn thận.',
  );
  await clickText(customer, '[role=dialog] button', 'Gửi đánh giá');
  await textOnPage(customer, '.order-item .badge', 'Đã đánh giá');
  console.log(
    'PASS pharmacist review, payment failure and retry, order progression and rating',
  );

  await open(customer, '/chat', '.chat-panel');
  await clickText(
    customer,
    '.chat-suggestions button',
    'Theo dõi đơn hàng của tôi',
  );
  await textOnPage(customer, '.chat-bubble.assistant', orderCode);
  await clickText(customer, '.chat-handoff', 'Kết nối dược sĩ');
  await textOnPage(
    customer,
    '.chat-bubble.assistant',
    'Yêu cầu đã được chuyển',
  );
  await clip(customer, 'chat-desktop');
  console.log('PASS enquiry about own order and pharmacist handoff');

  const admin = await openPage(1440, 1000);
  await login(admin, 'Quản trị', '/admin');
  await admin.waitForSelector('.adm-table');
  await clip(admin, 'admin-desktop');
  const sections = await admin.$$eval('.adm-sidebar nav button', (nodes) =>
    nodes.map((node) => node.textContent.trim()),
  );
  for (const section of sections) {
    await clickText(admin, '.adm-sidebar nav button', section);
    await admin.waitForFunction(() => !document.querySelector('.adm-loading'));
    assert.equal(await admin.$('.adm-error'), null, `Admin section ${section}`);
  }
  await clickText(admin, '.adm-sidebar nav button', 'Tài khoản');
  await clickText(admin, '.adm-toolbar button', 'Thêm nhân viên');
  await setField(admin, '[role=dialog] input[name=name]', 'Nhân viên kiểm thử');
  await setField(
    admin,
    '[role=dialog] input[name=email]',
    'qa.staff@antam.test',
  );
  await clickText(admin, '[role=dialog] button[type=submit]', 'Tạo tài khoản');
  await textOnPage(admin, '[role=dialog] h2', 'Đã tạo tài khoản nhân viên');
  await admin.click('[role=dialog] button[aria-label="Đóng"]');
  assert.ok(
    await app.locals.store.one(
      'SELECT id FROM nguoi_dung WHERE email=?',
      'qa.staff@antam.test',
    ),
  );
  await admin.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await open(admin, '/admin', '.ma-admin');
  await clip(admin, 'admin-mobile');
  console.log(
    `PASS ${sections.length} admin views, staff invitation and mobile admin layout`,
  );

  assert.deepEqual(errors, [], 'Browser errors');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await app.locals.store.close();
  rmSync(scratch, { recursive: true, force: true });
}
