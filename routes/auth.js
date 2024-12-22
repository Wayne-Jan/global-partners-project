const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 登入路由
router.post("/login", async (req, res) => {
  try {
    console.log("收到登入請求:", req.body);
    const { username, password } = req.body;

    // 檢查用戶是否存在
    const user = await User.findOne({ username });
    console.log("找到用戶:", user);

    if (!user) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 驗證密碼
    const isMatch = await user.comparePassword(password);
    // console.log("密碼驗證結果:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

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
        });

        await user.save();

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
        res.status(500).json({ message: "伺服器錯誤" });
      }
    });

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
    console.error("登入錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
