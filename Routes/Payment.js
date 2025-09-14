const express = require("express");
const Stripe = require("stripe");
const Order = require("../Models/Order");
const Product = require("../Models/Product");
const jwt = require("jsonwebtoken");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id: user._id, email: user.email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Create Checkout Session
router.post("/create-checkout-session/:productId", authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.productId);

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.quantity) {
      return res.status(400).json({ message: `Only ${product.quantity} kg available` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: product.name },
          unit_amount: product.price * 100,
        },
        quantity,
      }],
      mode: "payment",
      success_url: "https://smart-agribusiness.netlify.app/api/paymentsuccess",
      cancel_url: "https://smart-agribusiness.netlify.app/api/paymentfailed",
      metadata: {
        userId: req.user.id,
        productId: product._id.toString(),
        quantity: quantity.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



// Stripe Webhook
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const order = new Order({
      buyer: session.metadata.userId,
      product: session.metadata.productId,
      quantity: session.metadata.quantity,
      status: 'Pending',
      paymentId: session.payment_intent,
    });

    await order.save();
    await Product.findByIdAndUpdate(session.metadata.productId, {
      $inc: { quantity: -parseInt(session.metadata.quantity) },
    });
    
  }
  

  res.json({ received: true });
});


module.exports = router;
