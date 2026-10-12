// utils/nomba.js
const crypto = require('crypto');

// ─── Environment handling ───────────────────────────────────────────────────
// Sandbox and production aren't just different hosts — Nomba uses entirely
// different URL PATHS for checkout endpoints between the two:
//   sandbox:    https://sandbox.nomba.com/sandbox/checkout/order
//   production: https://api.nomba.com/v1/checkout/order
// Auth (/v1/auth/token/issue) is the only path that's identical on both hosts.
// Set NOMBA_ENV=sandbox while testing, and NOMBA_ENV=production when you
// switch to live keys. Defaults to sandbox so you don't accidentally hit
// production with test credentials.
const NOMBA_ENV = process.env.NOMBA_ENV || 'sandbox';
const IS_SANDBOX = NOMBA_ENV === 'sandbox';

const NOMBA_BASE_URL = IS_SANDBOX ? 'https://sandbox.nomba.com' : 'https://api.nomba.com';
const CHECKOUT_ORDER_PATH = IS_SANDBOX ? '/sandbox/checkout/order' : '/v1/checkout/order';
const CHECKOUT_TRANSACTION_PATH = IS_SANDBOX ? '/sandbox/checkout/transaction' : '/v1/checkout/transaction';

let cachedToken = null;
let tokenExpiresAt = 0;

// ─── Authentication ─────────────────────────────────────────────────────────
// Requires Node 18+ (uses the global fetch). Render's default Node runtime
// supports this — if you hit "fetch is not defined", check your Node version.
// Sandbox tokens are short-lived per Nomba's docs — if you get 401s mid-test,
// it's likely just an expired cached token; this function refreshes
// automatically on the next call once expired.

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 30000) {
    return cachedToken;
  }

  // Hackathon credential structure: authenticate with the PARENT account ID,
  // then subsequent calls (checkout order, transaction fetch) use the
  // SUB-account ID instead. This is based on the exact wording of the
  // Nomba hackathon onboarding email ("authenticate with the parent Account
  // ID in the accountId header, then scope your calls to your sub-account
  // ID") — Nomba's general public docs don't document this multi-tenant
  // hackathon flow, so if you get an accountId-related 401/403 on the
  // checkout calls below, this split is the first thing to double check
  // with hackathon support.
  const response = await fetch(`${NOMBA_BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: process.env.NOMBA_PARENT_ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data?.data?.access_token) {
    console.error('Nomba auth error:', data);
    throw new Error('Failed to authenticate with Nomba');
  }

  cachedToken = data.data.access_token;
  const expiresInMs = (data.data.expiresIn || 3300) * 1000; // default ~55 min
  tokenExpiresAt = Date.now() + expiresInMs;

  return cachedToken;
}

// ─── Create checkout order ──────────────────────────────────────────────────
// One checkoutLink covers both card and bank transfer — Nomba's hosted page
// shows whichever methods are enabled on your account.
// Sandbox checkout links look like: https://checkout.nomba.com/sandbox/<ref>
// Production links don't have the /sandbox/ segment.

async function createCheckoutOrder({ orderReference, amount, customerEmail, callbackUrl }) {
  const token = await getAccessToken();

  const response = await fetch(`${NOMBA_BASE_URL}${CHECKOUT_ORDER_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      accountId: process.env.NOMBA_SUB_ACCOUNT_ID,
    },
    body: JSON.stringify({
      order: {
        orderReference,
        amount: Number(amount).toFixed(2),
        currency: 'NGN',
        customerEmail,
        callbackUrl,
        allowedPaymentMethods: ['Card', 'Transfer'],
      },
    }),
  });

  const data = await response.json();

  if (!response.ok || data.code !== '00') {
    console.error('Nomba checkout order error:', data);
    throw new Error(data.description || 'Failed to create Nomba checkout order');
  }

  return data.data; // { checkoutLink, orderReference, ... }
}

// ─── Fetch checkout transaction (real server-side verification) ────────────
// This confirms payment status directly with Nomba — used as the source of
// truth by verify-payment, independent of whether the webhook has landed yet.
//
// ⚠️ One unconfirmed detail: Nomba's Sandbox Testing guide shows this call
// with `idType=orderReference` (lowercase, camelCase) in a working curl
// example, while their API Reference schema page lists the enum value as
// `ORDER_REFERENCE` (uppercase). These conflict. Using the lowercase form
// below since it's from a concrete working example — if you get a 400/422
// on this call, try swapping to 'ORDER_REFERENCE' as the first thing to test.

async function getCheckoutTransaction(orderReference) {
  const token = await getAccessToken();

  const url = `${NOMBA_BASE_URL}${CHECKOUT_TRANSACTION_PATH}?idType=orderReference&id=${encodeURIComponent(
    orderReference
  )}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      accountId: process.env.NOMBA_SUB_ACCOUNT_ID,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Nomba fetch transaction error:', data);
    throw new Error(data.description || 'Failed to fetch Nomba transaction status');
  }

  // data.data.success === true means the transaction is completed and paid
  return data.data;
}

// ─── Webhook signature verification ─────────────────────────────────────────
// Hashing formula below is taken directly from Nomba's own documentation
// sample. What ISN'T clearly documented (their code samples are behind JS
// tabs) is the exact header names carrying the signature and timestamp.
// ⚠️ CONFIRM THESE TWO CONSTANTS against a real webhook delivery — log
// req.headers on your first sandbox test hit and adjust if needed.
//
// Note: for matching a webhook back to our order, Nomba's "Fetch checkout
// transaction" endpoint confirms the order object has an `orderReference`
// field that echoes back exactly what we sent when creating the checkout —
// so the webhook handler looks for `data.order.orderReference` first,
// falling back to `data.transaction.merchantTxRef` only if that's missing.
const SIGNATURE_HEADER = 'signature';
const TIMESTAMP_HEADER = 'timestamp';

function verifyNombaSignature(payload, headers) {
  const signature = headers[SIGNATURE_HEADER];
  const timestamp = headers[TIMESTAMP_HEADER];

  if (!signature || !timestamp) {
    return false;
  }

  const merchant = payload?.data?.merchant || {};
  const transaction = payload?.data?.transaction || {};

  const hashingPayload = [
    payload.event_type,
    payload.requestId,
    merchant.userId,
    merchant.walletId,
    transaction.transactionId,
    transaction.type,
    transaction.time,
    transaction.responseCode,
  ].join(':');

  const message = `${hashingPayload}:${timestamp}`;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.NOMBA_WEBHOOK_SIGNATURE_KEY)
    .update(message)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false; // length mismatch or non-hex signature -> not valid
  }
}

module.exports = {
  getAccessToken,
  createCheckoutOrder,
  getCheckoutTransaction,
  verifyNombaSignature,
};