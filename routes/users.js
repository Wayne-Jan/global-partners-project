// routes/users.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth, isAdmin } = require("../middleware/auth");

// 獲取所有使用者
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "取得使用者列表失敗" });
  }
});

// 獲取單一使用者
router.get("/:id", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-password");
    if (!user) {
      return res.status(404).json({ message: "使用者不存在" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "取得使用者資料失敗" });
  }
});

// 更新使用者權限
router.patch("/:id/permissions", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "使用者不存在" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "無法修改管理員權限" });
    }

    user.assignedCountries = req.body.assignedCountries;
    await user.save();

    res.json({ message: "權限更新成功", user });
  } catch (error) {
    res.status(500).json({ message: "更新權限失敗" });
  }
});

module.exports = router;
