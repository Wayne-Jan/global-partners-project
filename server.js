const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const Partner = require("./models/Partner");
const authRoutes = require("./routes/auth");

const dashboardRoutes = require("./routes/dashboard");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// 使用認證路由
app.use("/api/auth", authRoutes);

// 測試路由 - 檢查用戶
app.get("/api/check-users", async (req, res) => {
  try {
    const User = require("./models/User");
    const users = await User.find({});
    console.log("現有用戶：", users);
    res.json(users);
  } catch (error) {
    console.error("查詢用戶錯誤：", error);
    res.status(500).json({ message: error.message });
  }
});

// Partners API routes
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await Partner.find();
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/partners", async (req, res) => {
  try {
    const partner = new Partner(req.body);
    const newPartner = await partner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

app.use("/api/dashboard", dashboardRoutes);
