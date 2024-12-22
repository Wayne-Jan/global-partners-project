const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const app = express();
const Partner = require("./models/Partner");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");

// Middleware
app.use(cors());
app.use(express.json());

// 首先處理根路由
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "partners.html"));
});

// 然後設置靜態檔案
app.use(express.static("public"));

// 登入狀態檢查中間件
const checkAuthStatus = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token 無效，但不阻止請求
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

// API 路由
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Partners API routes - 允許所有人訪問，但根據權限返回不同資訊
app.get("/api/partners", checkAuthStatus, async (req, res) => {
  try {
    const partners = await Partner.find();
    const enhancedPartners = partners.map((partner) => ({
      ...partner.toObject(),
      canEdit:
        req.user?.role === "admin" ||
        (req.user?.assignedCountries || []).includes(partner.country),
    }));
    res.json(enhancedPartners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 需要認證的 API endpoint
app.post("/api/partners", checkAuthStatus, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "需要登入" });
  }

  try {
    // 檢查權限
    if (
      req.user.role !== "admin" &&
      !req.user.assignedCountries.includes(req.body.country)
    ) {
      return res.status(403).json({ message: "沒有權限新增此國家的資料" });
    }

    const partner = new Partner(req.body);
    const newPartner = await partner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 更新合作夥伴資料
app.put("/api/partners/:id", checkAuthStatus, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "需要登入" });
  }

  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "找不到資料" });
    }

    if (
      req.user.role !== "admin" &&
      !req.user.assignedCountries.includes(partner.country)
    ) {
      return res.status(403).json({ message: "沒有權限修改此國家的資料" });
    }

    Object.assign(partner, req.body);
    const updatedPartner = await partner.save();
    res.json(updatedPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 處理前端路由
app.get("*", (req, res) => {
  // 檢查是否為 API 請求
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({ message: "API not found" });
  }
  res.sendFile(path.join(__dirname, "public", "partners.html"));
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "伺服器內部錯誤" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const partnerRoutes = require("./routes/partners");
app.use("/api/partners", partnerRoutes);
