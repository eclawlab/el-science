// Leshua (乐刷) Aggregated Payment Integration.
// Supports: QR code payment (get_tdcode), barcode payment (upload_authcode),
// order query (query_status), and refund (unified_refund).
// Gateway: https://paygate.leshuazf.com/cgi-bin/lepos_pay_gateway.cgi

const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

// ── Configuration (from environment) ──

const MERCHANT_ID = process.env.LESHUA_MERCHANT_ID || '';
const TRADE_KEY = process.env.LESHUA_TRADE_KEY || '';
const NOTIFY_KEY = process.env.LESHUA_NOTIFY_KEY || '';
const GATEWAY_URL = process.env.LESHUA_GATEWAY_URL || 'https://paygate.leshuazf.com/cgi-bin/lepos_pay_gateway.cgi';
const NOTIFY_BASE_URL = process.env.LESHUA_NOTIFY_BASE_URL || ''; // e.g. https://your-domain.com

function isEnabled() {
  return MERCHANT_ID.length > 0 && TRADE_KEY.length > 0;
}

// ── Signing ──

function sign(params) {
  const sorted = Object.keys(params).sort();
  const parts = sorted.filter(k => params[k] !== '' && params[k] != null && k !== 'sign')
    .map(k => `${k}=${params[k]}`);
  const str = parts.join('&') + '&key=' + TRADE_KEY;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

function verifyResponseSign(params) {
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'sign' && k !== 'leshua' && k !== 'resp_code' && v !== '' && v != null) {
      filtered[k] = v;
    }
  }
  const sorted = Object.keys(filtered).sort();
  const parts = sorted.map(k => `${k}=${filtered[k]}`);
  const str = parts.join('&') + '&key=' + TRADE_KEY;
  const expected = crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
  return expected === params.sign;
}

function verifyNotifySign(params) {
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'sign' && k !== 'leshua' && k !== 'error_code' && v !== '' && v != null) {
      filtered[k] = v;
    }
  }
  const sorted = Object.keys(filtered).sort();
  const parts = sorted.map(k => `${k}=${filtered[k]}`);
  const str = parts.join('&') + '&key=' + NOTIFY_KEY;
  const expected = crypto.createHash('md5').update(str, 'utf8').digest('hex').toLowerCase();
  return expected === (params.sign || '').toLowerCase();
}

// ── Nonce ──

function nonceStr(len = 32) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

// ── Order ID ──

function generateOrderId() {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return 'ELM' + ts + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ── XML Parsing (simple, no deps) ──

function parseXml(xml) {
  const result = {};
  // Strip outer <xml> wrapper
  const inner = xml.replace(/^\s*<xml[^>]*>\s*/i, '').replace(/<\/xml>\s*$/i, '');
  const regex = /<(\w+)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g;
  let match;
  while ((match = regex.exec(inner)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] !== undefined ? match[2] : match[4];
    result[key] = value;
  }
  return result;
}

// ── Gateway Request ──

function postToGateway(params) {
  params.sign = sign(params);

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const url = new URL(GATEWAY_URL);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/xml',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = parseXml(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('XML parse failed: ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('gateway timeout')); });
    req.write(body);
    req.end();
  });
}

// ── API: Create QR Code Order (统一下单) ──
// Returns a payment URL/QR code for the user to scan.

async function createOrder({ amountFen, body, orderId, payWay, jsPayFlag, notifyUrl }) {
  const params = {
    service: 'get_tdcode',
    merchant_id: MERCHANT_ID,
    third_order_id: orderId || generateOrderId(),
    amount: String(amountFen),
    jspay_flag: jsPayFlag || '0', // 0=QR scan, 1=JSAPI, 2=H5
    nonce_str: nonceStr(),
  };

  if (body) params.body = body;
  if (payWay) params.pay_way = payWay; // WXZF, ZFBZF, UPSMZF
  if (notifyUrl || NOTIFY_BASE_URL) {
    params.notify_url = notifyUrl || (NOTIFY_BASE_URL + '/api/payment/notify');
  }

  const result = await postToGateway(params);
  return {
    success: result.resp_code === '0' && result.result_code === '0',
    orderId: params.third_order_id,
    leshuaOrderId: result.leshua_order_id,
    qrCodeUrl: result.td_code, // QR code content URL
    errorCode: result.error_code,
    errorMsg: result.error_msg,
    raw: result,
  };
}

// ── API: Barcode Payment (付款码支付) ──
// Merchant scans customer's payment barcode.

async function barcodePay({ amountFen, authCode, body, orderId, notifyUrl }) {
  const params = {
    service: 'upload_authcode',
    merchant_id: MERCHANT_ID,
    third_order_id: orderId || generateOrderId(),
    amount: String(amountFen),
    auth_code: authCode,
    nonce_str: nonceStr(),
  };

  if (body) params.body = body;
  if (notifyUrl || NOTIFY_BASE_URL) {
    params.notify_url = notifyUrl || (NOTIFY_BASE_URL + '/api/payment/notify');
  }

  const result = await postToGateway(params);
  return {
    success: result.resp_code === '0' && result.result_code === '0',
    orderId: params.third_order_id,
    leshuaOrderId: result.leshua_order_id,
    status: result.status, // 2=success
    errorCode: result.error_code,
    errorMsg: result.error_msg,
    raw: result,
  };
}

// ── API: Query Order (订单查询) ──

async function queryOrder({ orderId, leshuaOrderId }) {
  const params = {
    service: 'query_status',
    merchant_id: MERCHANT_ID,
    nonce_str: nonceStr(),
  };

  if (leshuaOrderId) params.leshua_order_id = leshuaOrderId;
  else if (orderId) params.third_order_id = orderId;
  else throw new Error('orderId or leshuaOrderId required');

  const result = await postToGateway(params);
  return {
    success: result.resp_code === '0' && result.result_code === '0',
    status: result.status, // 2=paid, others=pending/failed
    orderId: result.third_order_id,
    leshuaOrderId: result.leshua_order_id,
    amount: result.amount,
    errorCode: result.error_code,
    errorMsg: result.error_msg,
    raw: result,
  };
}

// ── API: Refund (统一退款) ──

async function refund({ orderId, leshuaOrderId, refundAmountFen, refundId, notifyUrl }) {
  const params = {
    service: 'unified_refund',
    merchant_id: MERCHANT_ID,
    refund_amount: String(refundAmountFen),
    merchant_refund_id: refundId || generateOrderId(),
    nonce_str: nonceStr(),
  };

  if (leshuaOrderId) params.leshua_order_id = leshuaOrderId;
  else if (orderId) params.third_order_id = orderId;
  else throw new Error('orderId or leshuaOrderId required');

  if (notifyUrl || NOTIFY_BASE_URL) {
    params.notify_url = notifyUrl || (NOTIFY_BASE_URL + '/api/payment/notify');
  }

  const result = await postToGateway(params);
  return {
    success: result.resp_code === '0' && result.result_code === '0',
    refundId: params.merchant_refund_id,
    errorCode: result.error_code,
    errorMsg: result.error_msg,
    raw: result,
  };
}

// ── Notification Handler ──
// Parses and verifies async payment notification XML body.

function handleNotification(xmlBody) {
  if (!NOTIFY_KEY) {
    return { valid: false, error: 'Notify key not configured' };
  }

  const params = parseXml(xmlBody);

  if (!verifyNotifySign(params)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return {
    valid: true,
    status: params.status, // "2" = success
    paid: params.status === '2',
    orderId: params.third_order_id,
    leshuaOrderId: params.leshua_order_id,
    amount: params.account || params.amount,
    attach: params.attach,
    raw: params,
  };
}

module.exports = {
  isEnabled,
  sign,
  verifyResponseSign,
  verifyNotifySign,
  generateOrderId,
  createOrder,
  barcodePay,
  queryOrder,
  refund,
  handleNotification,
  parseXml,
};
