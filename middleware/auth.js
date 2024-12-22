const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "請先登入" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "用戶不存在" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "認證失敗" });
  }
};

// 檢查是否為管理員
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "沒有權限" });
  }
  next();
};

// 檢查國家權限
const checkCountryAccess = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }

  const country = req.params.country || req.body.country;
  if (!req.user.assignedCountries.includes(country)) {
    return res.status(403).json({ message: "沒有權限訪問該國家數據" });
  }
  next();
};

module.exports = { auth, isAdmin, checkCountryAccess };
