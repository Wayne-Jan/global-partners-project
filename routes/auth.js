const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 登入路由
router.post("/login", async (req, res) => {
  try {
    console.log("Login attempt received:", {
      username: req.body.username,
      origin: req.get("origin"),
    });

    const { username, password } = req.body;

    // 檢查輸入
    if (!username || !password) {
      console.log("Missing credentials");
      return res.status(400).json({
        message: "請輸入帳號和密碼",
        details: "缺少必要資訊",
      });
    }

    // 檢查用戶是否存在
    const user = await User.findOne({ username });

    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 驗證密碼
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("Password verification failed for:", username);
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 檢查 JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      return res.status(500).json({
        message: "伺服器設定錯誤",
        details: "JWT 設定缺失",
      });
    }

    // 生成 token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("Login successful:", {
      username: user.username,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        assignedCountries: user.assignedCountries,
      },
    });
  } catch (error) {
    console.error("Login error:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    res.status(500).json({
      message: "伺服器錯誤",
      error:
        process.env.NODE_ENV === "development" ? error.message : "請稍後再試",
    });
  }
});

// 註冊路由
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶是否已存在
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "此帳號已被註冊" });
    }

    // 創建新用戶
    user = new User({
      username,
      password,
      role: "user",
      assignedCountries: [],
      isActive: true,
    });

    await user.save();
    console.log("New user registered:", username);

    res.status(201).json({
      message: "註冊成功",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    res.status(500).json({
      message: "伺服器錯誤",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
