const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 登入路由
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶是否存在
    const user = await User.findOne({ username });
    if (!user) {
      console.log("Login attempt failed: User not found -", username);
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 驗證密碼
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Login attempt failed: Invalid password -", username);
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 檢查帳號狀態
    if (!user.isActive) {
      console.log("Login attempt failed: Inactive account -", username);
      return res.status(401).json({ message: "帳號已被停用" });
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        assignedCountries: user.assignedCountries,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 設定 cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24小時
    });

    // 更新最後登入時間
    await user.updateLastLogin();

    console.log("Login successful:", username);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        assignedCountries: user.assignedCountries,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("登入錯誤:", error);
    res.status(500).json({
      message: "伺服器錯誤",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
