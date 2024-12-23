const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

// Require all routes
const Partner = require("./models/Partner");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const partnerRoutes = require("./routes/partners");

const app = express();

// 定義允許的域名
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://global-partners-nchu.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// 登入狀態檢查中間件
const checkAuthStatus = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      console.log("Invalid token:", error.message);
    }
  }
  next();
};

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Static files & root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "partners.html"));
});

app.use(express.static("public"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/partners", partnerRoutes);

// Handle frontend routes
app.get("*", (req, res) => {
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({ message: "API not found" });
  }
  res.sendFile(path.join(__dirname, "public", "partners.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", err);
  res.status(500).json({
    message: "伺服器內部錯誤",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
