const express = require('express');
const router = express.Router();
const prisma = require('../prisma.js');

const PAYPAL_BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const parseAmount = (value) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : NaN;
};

const getPaypalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error('Missing PayPal credentials');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
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
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
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
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal create order error:', data);
      return res.status(500).json({ error: 'Unable to create PayPal order.' });
    }

    return res.json({
      orderID: data.id,
      clientId: process.env.PAYPAL_CLIENT_ID,
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
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal capture error:', data);
      return res.status(500).json({ error: 'Unable to capture PayPal order.' });
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
