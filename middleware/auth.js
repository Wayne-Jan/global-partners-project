const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 認證中間件
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log("No token provided");
      return res.status(401).json({
        message: "請先登入",
        details: "未提供認證令牌",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log("JWT verification failed:", jwtError.message);
      return res.status(401).json({
        message: "認證失敗",
        details: "無效的認證令牌",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log("User not found for ID:", decoded.userId);
      return res.status(401).json({
        message: "認證失敗",
        details: "用戶帳號不存在或已被刪除",
      });
    }

    if (!user.isActive) {
      console.log("User account is inactive:", decoded.userId);
      return res.status(401).json({
        message: "認證失敗",
        details: "用戶帳號已停用",
      });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      assignedCountries: user.assignedCountries || [],
      email: user.email,
      name: user.name,
    };

    console.log("Authentication successful for user:", {
      userId: user._id,
      role: user.role,
    });

    next();
  } catch (error) {
    console.error("Authentication error:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      message: "系統錯誤",
      details: "認證過程發生錯誤，請稍後再試",
    });
  }
};

// 管理員權限檢查中間件
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      console.log("No user object in request");
      return res.status(401).json({
        message: "認證失敗",
        details: "請先登入",
      });
    }

    if (req.user.role !== "admin") {
      console.log("Non-admin access attempt:", {
        userId: req.user.userId,
        role: req.user.role,
      });
      return res.status(403).json({
        message: "權限不足",
        details: "此操作需要管理員權限",
      });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({
      message: "系統錯誤",
      details: "權限檢查過程發生錯誤",
    });
  }
};

// 國家權限檢查中間件
const checkCountryAccess = (req, res, next) => {
  try {
    if (!req.user) {
      console.log("No user object in request");
      return res.status(401).json({
        message: "認證失敗",
        details: "請先登入",
      });
    }

    // 管理員擁有所有國家的訪問權限
    if (req.user.role === "admin") {
      return next();
    }

    const requestedCountry = req.params.country || req.body?.country?.code;

    if (!requestedCountry) {
      console.log("No country specified in request");
      return res.status(400).json({
        message: "請求錯誤",
        details: "未指定國家代碼",
      });
    }

    if (!Array.isArray(req.user.assignedCountries)) {
      console.log(
        "Invalid assignedCountries format:",
        req.user.assignedCountries
      );
      return res.status(500).json({
        message: "系統錯誤",
        details: "用戶國家權限設定錯誤",
      });
    }

    if (!req.user.assignedCountries.includes(requestedCountry)) {
      console.log("Country access denied:", {
        userId: req.user.userId,
        requestedCountry,
        assignedCountries: req.user.assignedCountries,
      });
      return res.status(403).json({
        message: "權限不足",
        details: "您沒有權限訪問該國家的數據",
      });
    }

    next();
  } catch (error) {
    console.error("Country access check error:", error);
    res.status(500).json({
      message: "系統錯誤",
      details: "國家權限檢查過程發生錯誤",
    });
  }
};

module.exports = { auth, isAdmin, checkCountryAccess };
