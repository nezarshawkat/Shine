const express = require('express');
const https = require('https');
const router = express.Router();
const prisma = require('../prisma.js');

const fetchImpl = (url, options = {}) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(url, options);
  }

  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const request = https.request(
      {
        method: options.method || 'GET',
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: options.headers,
      },
      (response) => {
        let rawBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          rawBody += chunk;
        });
        response.on('end', () => {
          const status = response.statusCode || 500;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => (rawBody ? JSON.parse(rawBody) : {}),
            text: async () => rawBody,
          });
        });
      }
    );

    request.on('error', reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
};

const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const parseAmount = (value) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : NaN;
};

const getPaypalClientId = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;

  if (!clientId) {
    throw new Error('Missing PayPal client ID');
  }

  return clientId;
};

const getPaypalSecret = () => {
  const secret = process.env.PAYPAL_SECRET;

  if (!secret) {
    throw new Error('Missing PayPal secret');
  }

  return secret;
};

router.get('/paypal/config', (_req, res) => {
  try {
    return res.json({
      clientId: getPaypalClientId(),
      environment: PAYPAL_ENV,
      currency: 'USD',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load PayPal configuration.' });
  }
});

const getPaypalAccessToken = async () => {
  const auth = Buffer.from(`${getPaypalClientId()}:${getPaypalSecret()}`).toString('base64');
  const response = await fetchImpl(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || 'Unable to authenticate with PayPal');
  }

  return data.access_token;
};

router.post('/paypal/create-order', express.json(), async (req, res) => {
  try {
    const amount = parseAmount(req.body?.amount);
    const userId = req.body?.userId;

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: 'Please provide a valid donation amount of at least $1.' });
    }

    const accessToken = await getPaypalAccessToken();

    const response = await fetchImpl(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
            description: 'Shine Community Donation',
            custom_id: userId || 'guest',
          },
        ],
        application_context: {
          brand_name: 'Shine Community',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal create order error:', data);
      return res.status(500).json({ error: data.message || 'Unable to create PayPal order.' });
    }

    const approveLink = data.links.find((link) => link.rel === 'approve')?.href;

    return res.json({
      orderID: data.id,
      clientId: getPaypalClientId(),
      approveLink,
    });
  } catch (error) {
    console.error('PayPal create order error:', error.message);
    return res.status(500).json({ error: error.message || 'Unable to create PayPal order.' });
  }
});

router.post('/paypal/capture-order', express.json(), async (req, res) => {
  try {
    const orderID = req.body?.orderID;
    const userId = req.body?.userId;

    if (!orderID) {
      return res.status(400).json({ error: 'PayPal order ID is required.' });
    }

    const accessToken = await getPaypalAccessToken();
    const response = await fetchImpl(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal capture error:', data);
      return res.status(500).json({ error: data.message || 'Unable to capture PayPal order.' });
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const payerEmail = data.payer?.email_address || null;
    const amountValue = Number.parseFloat(capture?.amount?.value || data.purchase_units?.[0]?.amount?.value || '0');
    const customId = data.purchase_units?.[0]?.custom_id;
    const donationUserId = userId || (customId && customId !== 'guest' ? customId : null);

    if (donationUserId) {
      try {
        await prisma.user.update({
          where: { id: donationUserId },
          data: { isSupporter: true },
        });
      } catch (dbError) {
        console.error('PayPal supporter update error:', dbError.message);
      }
    }

    return res.json({
      message: 'Donation successful',
      orderID: data.id,
      transactionID: capture?.id || null,
      amount: amountValue,
      payerEmail,
      status: capture?.status || data.status,
    });
  } catch (error) {
    console.error('PayPal capture error:', error.message);
    return res.status(500).json({ error: error.message || 'Unable to capture PayPal order.' });
  }
});

module.exports = router;
