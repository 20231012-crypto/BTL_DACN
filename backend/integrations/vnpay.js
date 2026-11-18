import { createHmac, timingSafeEqual } from 'node:crypto';
import { assert } from '../services/shared.js';

const paymentEndpoint = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const transactionEndpoint =
  'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
const version = '2.1.0';
const clock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const gatewayDate = (value) => clock.format(new Date(value)).replace(/\D/g, '');
const encode = (value) => encodeURIComponent(value).replace(/%20/g, '+');

export function vnpayConfig(origin) {
  const merchant = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  if (!merchant || !secret) return null;
  return { merchant, secret, returnUrl: `${origin}/api/payments/vnpay/return` };
}

export function vnpayQuery(values) {
  return Object.keys(values)
    .filter(
      (key) =>
        key.startsWith('vnp_') &&
        key !== 'vnp_SecureHash' &&
        key !== 'vnp_SecureHashType',
    )
    .sort()
    .map((key) => `${encode(key)}=${encode(values[key])}`)
    .join('&');
}

export const vnpayHash = (secret, message) =>
  createHmac('sha512', secret).update(message).digest('hex');

function validHash(signature, expected) {
  return (
    typeof signature === 'string' &&
    /^[0-9a-f]{128}$/i.test(signature) &&
    timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  );
}

export function readVnpayResult(config, query) {
  if (
    !config ||
    Object.entries(query).some(
      ([key, value]) => key.startsWith('vnp_') && typeof value !== 'string',
    )
  )
    return null;
  if (
    !validHash(
      query.vnp_SecureHash,
      vnpayHash(config.secret, vnpayQuery(query)),
    )
  )
    return null;
  if (
    query.vnp_TmnCode !== config.merchant ||
    !/^[A-Z0-9]{1,40}$/.test(query.vnp_TxnRef || '') ||
    !/^\d+$/.test(query.vnp_Amount || '')
  )
    return null;
  const amount = Number(query.vnp_Amount);
  if (!Number.isSafeInteger(amount) || amount % 100 !== 0) return null;
  const successful =
    query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
  if (successful && !/^\d{1,15}$/.test(query.vnp_TransactionNo || ''))
    return null;
  return {
    reference: query.vnp_TxnRef,
    amount: amount / 100,
    successful,
    transactionNo: query.vnp_TransactionNo || '',
    responseCode: query.vnp_ResponseCode || '',
  };
}

export function vnpayPaymentUrl(
  config,
  { reference, order, createdAt, expiresAt, ip },
) {
  const query = vnpayQuery({
    vnp_Version: version,
    vnp_Command: 'pay',
    vnp_TmnCode: config.merchant,
    vnp_Amount: order.total * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: reference,
    vnp_OrderInfo: `Thanh toan don ${order.code}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ip,
    vnp_CreateDate: gatewayDate(createdAt),
    vnp_ExpireDate: gatewayDate(expiresAt),
  });
  return `${paymentEndpoint}?${query}&vnp_SecureHash=${vnpayHash(config.secret, query)}`;
}

export async function vnpayRefund(
  config,
  { reference, payment, amount, userId, ip },
) {
  const data = {
    vnp_RequestId: reference,
    vnp_Version: version,
    vnp_Command: 'refund',
    vnp_TmnCode: config.merchant,
    vnp_TransactionType: amount === payment.amount ? '02' : '03',
    vnp_TxnRef: payment.reference,
    vnp_Amount: amount * 100,
    vnp_TransactionNo: payment.provider_reference,
    vnp_TransactionDate: gatewayDate(payment.created_at),
    vnp_CreateBy: `antam-${userId}`,
    vnp_CreateDate: gatewayDate(Date.now()),
    vnp_IpAddr: ip,
    vnp_OrderInfo: `Hoan tien ${payment.reference}`,
  };
  data.vnp_SecureHash = vnpayHash(config.secret, Object.values(data).join('|'));
  const response = await fetch(transactionEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify(data),
  });
  assert(
    response.ok,
    502,
    'Cần đối soát trạng thái hoàn tiền trên VNPay Sandbox.',
  );
  const result = await response.json();
  const fields = [
    'ResponseId',
    'Command',
    'ResponseCode',
    'Message',
    'TmnCode',
    'TxnRef',
    'Amount',
    'BankCode',
    'PayDate',
    'TransactionNo',
    'TransactionType',
    'TransactionStatus',
    'OrderInfo',
  ];
  const signed = fields.map((key) => result[`vnp_${key}`] ?? '').join('|');
  assert(
    validHash(result.vnp_SecureHash, vnpayHash(config.secret, signed)) &&
      result.vnp_TmnCode === config.merchant &&
      result.vnp_TxnRef === payment.reference &&
      Number(result.vnp_Amount) === data.vnp_Amount &&
      result.vnp_TransactionType === data.vnp_TransactionType,
    502,
    'Cần đối soát kết quả hoàn tiền trên VNPay Sandbox.',
  );
  return {
    confirmed:
      result.vnp_ResponseCode === '00' && result.vnp_TransactionStatus === '00',
    reference: String(result.vnp_TransactionNo || ''),
  };
}
