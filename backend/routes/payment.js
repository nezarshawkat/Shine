const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require("../prisma.js");

// 1. THE DONATE ROUTE
// We use express.json() here specifically because this route is defined 
// BEFORE the global app.use(express.json()) in server.js
router.post('/donate', express.json(), async (req, res) => {
  try {
    const { amount, userId } = req.body;

    // Validation for Environment Variables
    if (!process.env.FRONTEND_URL) {
      console.error("❌ MISSING FRONTEND_URL");
      return res.status(500).json({ error: "Server configuration error: Missing FRONTEND_URL" });
    }

    // Clean the URL to ensure no double slashes
    const baseUrl = process.env.FRONTEND_URL.replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: 'Shine Community Donation',
            description: 'Support for website funds',
          },
          unit_amount: Math.round(amount * 100), // Stripe expects cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { 
        userId: userId && userId !== "undefined" ? userId : "guest" 
      }, 
      success_url: `${baseUrl}/donate?success=true`,
      cancel_url: `${baseUrl}/donate?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. THE WEBHOOK ROUTE
// This MUST use express.raw to verify the Stripe signature. 
// It works now because we placed it before the global express.json() in server.js
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

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log(`💰 Payment successful: $${session.amount_total / 100} from User: ${userId}`);
    
    // Update the database if the user was logged in
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
        console.error("❌ Database Update Error:", dbError.message);
      }
    } else {
      console.log("ℹ️ Anonymous donation received. No user profile to update.");
    }
  }

  res.json({ received: true });
});

module.exports = router;