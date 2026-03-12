const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Fixed import to match your server.js (using .js extension)
const prisma = require("../prisma.js");

// 1. THE DONATE ROUTE
// Added express.json() specifically here so it doesn't interfere with the global webhook
router.post('/donate', express.json(), async (req, res) => {
  try {
    const { amount, userId } = req.body;

    // Validation to prevent the "Invalid URL" error
    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is missing in .env file");
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
    console.error("Stripe Session Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. THE WEBHOOK ROUTE
// This MUST use express.raw to verify the Stripe signature
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