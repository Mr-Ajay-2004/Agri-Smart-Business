const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");


const app = express();
const PORT = process.env.PORT || 5000;
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// Middlewares
const cors = require("cors");

app.use(
  cors({
    origin: ["http://localhost:5173", "https://https://smart-agribusiness.netlify.app"], 
    credentials: true, // if you are using cookies
  })
);
app.use(express.json());

// Auth routes
const authRoutes = require("./Routes/Login");
app.use(authRoutes);

// Product routes
const productRoutes = require("./Routes/Farmer/Product");
app.use("/api/products",productRoutes);

// Payment Routes

const Payments=require('./Routes/Payment');
app.use("/api/payment",Payments);

// Admin Routes
const Admin=require('./Admin')
app.use("/api/admin",Admin)

//Connect MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB is Connected'))
.catch((error) => console.log("MongoDB Connection Failure: " + error));

// Server Listen on the Port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));