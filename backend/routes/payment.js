const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require("../prisma.js");

// ================= 1. DONATE ROUTE =================
router.post('/donate', async (req, res) => {
  try {
    console.log("👉 Donate route hit");

    const { amount, userId } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is missing in environment variables");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: 'Shine Community Donation',
            description: 'Support for website funds',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { userId: userId || "guest" }, 
      success_url: `${process.env.FRONTEND_URL}/donate?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/donate?canceled=true`,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("❌ Stripe Session Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= 2. STRIPE WEBHOOK =================
// IMPORTANT: must stay raw
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET 
    );
  } catch (err) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ================= HANDLE PAYMENT =================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log(`💰 Payment successful: $${session.amount_total / 100} from User: ${userId}`);
    
    if (userId && userId !== "guest") {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            isSupporter: true,
            donations: {
              create: {
                amount: session.amount_total / 100,
                stripeSessionId: session.id,
                status: "completed"
              }
            }
          }
        });

        console.log(`✅ Database updated for Supporter: ${userId}`);
      } catch (dbError) {
        console.error("❌ Database Update Error:", dbError);
      }
    } else {
      console.log("ℹ️ Anonymous donation received");
    }
  }

  res.json({ received: true });
});

module.exports = router;