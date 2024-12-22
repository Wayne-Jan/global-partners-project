const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// 註冊路由
router.post("/register", async (req, res) => {
  try {
    const { username, password, role, assignedCountries } = req.body;

    // 檢查用戶是否已存在
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "用戶已存在" });
    }

    // 創建新用戶
    user = new User({
      username,
      password,
      role: role || "user",
      assignedCountries: assignedCountries || [],
    });

    await user.save();

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        assignedCountries: user.assignedCountries,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 登入路由
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶是否存在
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "用戶名或密碼錯誤" });
    }

    // 驗證密碼
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "用戶名或密碼錯誤" });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

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
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
