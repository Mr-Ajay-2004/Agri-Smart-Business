const express = require("express");
const router = express.Router();
const User = require("./Models/User");
const Product = require("./Models/Product");
const Order = require("./Models/Order");
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded;
    console.log(decoded);
    
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.get("/users", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const users = await User.find({ role: "user" }).select("name email role createdAt");
  res.json(users);
});

router.get("/farmers", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const farmers = await User.find({ role: "farmer" }).select("name email role createdAt");
  res.json(farmers);
});

router.get("/products", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const products = await Product.find().populate("farmer", "name email");
  const transformed = products.map((p) => ({
    _id: p._id,
    name: p.name,
    category: p.category,
    price: p.price,
    quantity: p.quantity,
    farmer: p.farmer?.name || "-",
  }));
  res.json(transformed);
});


module.exports = router;
