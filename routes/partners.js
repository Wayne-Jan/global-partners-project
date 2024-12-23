const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const { auth, isAdmin } = require("../middleware/auth");

// 獲取所有合作夥伴列表（添加分頁功能）
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const partners = await Partner.find()
      .select("-contacts -sites")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Partner.countDocuments();

    res.json({
      partners,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "獲取合作夥伴列表失敗", error: error.message });
  }
});

// 獲取特定合作夥伴詳細資訊
router.get("/:id", async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }
    res.json(partner);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "無效的合作夥伴ID" });
    }
    res
      .status(500)
      .json({ message: "獲取合作夥伴資訊失敗", error: error.message });
  }
});

// 新增合作夥伴 (需要管理員權限)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "使用者驗證失敗" });
    }

    // 添加初始時間軸記錄
    const initialTimeline = {
      date: new Date(),
      event: "建立合作夥伴",
      description: `初始階段：${req.body.progress.phase}`,
      type: "create",
    };

    const partner = new Partner({
      ...req.body,
      timeline: [initialTimeline], // 加入初始時間軸記錄
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });

    const newPartner = await partner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ message: "新增合作夥伴失敗", error: error.message });
  }
});

// 更新合作夥伴資訊 (需要管理員權限)
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const oldPartner = await Partner.findById(req.params.id);
    if (!oldPartner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    // 檢查進度是否改變
    const isProgressChanged =
      oldPartner.progress.phase !== req.body.progress.phase;

    // 準備更新資料
    const updateData = {
      ...req.body,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    };

    // 如果沒有提供 timeline，則使用舊的
    if (!updateData.timeline) {
      updateData.timeline = oldPartner.timeline || [];
    }

    // 如果進度改變，添加新的時間軸記錄
    if (isProgressChanged) {
      const timelineEntry = {
        date: new Date(),
        event: `階段更新：${req.body.progress.phase}`,
        description: req.body.progress.details || "",
        type: "update",
      };
      updateData.timeline = [...updateData.timeline, timelineEntry];
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedPartner);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ message: "更新合作夥伴失敗", error: error.message });
  }
});

// 刪除合作夥伴 (需要管理員權限)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const result = await Partner.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    res.json({ message: "合作夥伴已成功刪除" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "無效的合作夥伴ID" });
    }
    res.status(500).json({ message: "刪除合作夥伴失敗", error: error.message });
  }
});

// 取得國家列表
router.get("/utils/countries", auth, async (req, res) => {
  try {
    const countries = {
      TW: { name: "台灣", flag: "🇹🇼" },
      US: { name: "美國", flag: "🇺🇸" },
      JP: { name: "日本", flag: "🇯🇵" },
      TH: { name: "泰國", flag: "🇹🇭" },
      VN: { name: "越南", flag: "🇻🇳" },
      ID: { name: "印尼", flag: "🇮🇩" },
      IN: { name: "印度", flag: "🇮🇳" },
      DE: { name: "德國", flag: "🇩🇪" },
    };
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: "獲取國家列表失敗", error: error.message });
  }
});

// 錯誤處理中間件
router.use((error, req, res, next) => {
  console.error("路由錯誤:", error);
  res.status(500).json({
    message: "伺服器內部錯誤",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "請聯繫系統管理員",
  });
});

module.exports = router;
