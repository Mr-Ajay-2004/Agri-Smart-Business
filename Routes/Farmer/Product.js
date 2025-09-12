const express = require("express");
const router = express.Router();
const Product = require("../../Models/Product");
const jwt = require("jsonwebtoken");
const multer = require("multer");

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder must exist in your project
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // unique filename
  },
});

const upload = multer({ storage });

// Add product
router.post("/add", upload.single("image"), authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer")
      return res.status(403).json({ message: "Only farmers can add products" });

    const { name, category, price, quantity, description } = req.body;

    if (!name || !price || !quantity)
      return res.status(400).json({ message: "Name, price, quantity required" });

    let image = "";
    if (req.file) image = req.file.filename; // save filename in DB

    const product = new Product({
      farmer: req.user.id,
      name,
      category,
      description,
      price: Number(price),
      quantity: Number(quantity),
      image, // filename stored
    });

    await product.save();
    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get farmer products
router.get("/my-products", authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user.id });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Show All Products
router.get("/productslist", async (req, res) => {
  try {
    const products = await Product.find().populate("farmer", "email"); 

    // Transform image field to full URL
    const productsWithFullImage = products.map(p => ({
      ...p._doc,
      image: p.image ? `http://localhost:5000/uploads/${p.image}` : null
    }));

    res.status(200).json(productsWithFullImage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 
