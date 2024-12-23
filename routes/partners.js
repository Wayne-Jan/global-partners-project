const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const { auth, isAdmin } = require("../middleware/auth");

// 取得國家列表 (放在最前面避免與 :id 路由衝突)
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

// 獲取所有合作夥伴列表
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
    res.status(500).json({
      message: "獲取合作夥伴列表失敗",
      error: error.message,
    });
  }
});

// 新增合作夥伴
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "使用者驗證失敗" });
    }

    const initialTimeline = {
      date: new Date(),
      event: "建立合作夥伴",
      description: `初始階段：${req.body.progress.phase}`,
      type: "create",
    };

    const partner = new Partner({
      ...req.body,
      timeline: [initialTimeline],
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

// 更新時間軸事件
router.put("/:partnerId/timeline/:eventId", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId, eventId } = req.params;
    const { event, description, phase, date } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    const timelineIndex = partner.timeline.findIndex(
      (event) => event._id.toString() === eventId
    );

    if (timelineIndex === -1) {
      return res.status(404).json({ message: "找不到此時間軸事件" });
    }

    // 保留原始的 _id
    const originalEventId = partner.timeline[timelineIndex]._id;

    partner.timeline[timelineIndex] = {
      _id: originalEventId,
      event,
      description,
      phase,
      date: new Date(date),
      updatedAt: new Date(),
      updatedBy: req.user.userId,
      type: partner.timeline[timelineIndex].type, // 保留原始的類型
    };

    const updatedPartner = await partner.save();

    res.json({
      message: "時間軸事件已成功更新",
      timeline: updatedPartner.timeline,
    });
  } catch (error) {
    console.error("Update timeline error:", error);
    res.status(500).json({
      message: "更新時間軸事件失敗",
      error: error.message,
    });
  }
});

// 刪除時間軸事件
router.delete(
  "/:partnerId/timeline/:eventId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { partnerId, eventId } = req.params;
      const partner = await Partner.findById(partnerId);

      if (!partner) {
        return res.status(404).json({ message: "找不到此合作夥伴" });
      }

      if (!partner.timeline || !Array.isArray(partner.timeline)) {
        return res.status(400).json({ message: "時間軸資料格式錯誤" });
      }

      const timelineIndex = partner.timeline.findIndex(
        (event) => event._id.toString() === eventId
      );

      if (timelineIndex === -1) {
        return res.status(404).json({ message: "找不到此時間軸事件" });
      }

      partner.timeline.splice(timelineIndex, 1);
      const updatedPartner = await partner.save();

      res.json({
        message: "時間軸事件已成功刪除",
        timeline: updatedPartner.timeline,
      });
    } catch (error) {
      console.error("Delete timeline error:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ message: "無效的ID格式" });
      }
      res.status(500).json({
        message: "刪除時間軸事件失敗",
        error: error.message,
      });
    }
  }
);

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
    res.status(500).json({
      message: "獲取合作夥伴資訊失敗",
      error: error.message,
    });
  }
});

// 更新合作夥伴資訊
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const oldPartner = await Partner.findById(req.params.id);
    if (!oldPartner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    if (req.body.resources) {
      req.body.resources = req.body.resources.map((resource) => ({
        ...resource,
        createdAt: resource.createdAt || new Date(),
      }));
    }

    const isProgressChanged =
      oldPartner.progress.phase !== req.body.progress.phase;
    const updateData = {
      ...req.body,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    };

    if (!updateData.timeline) {
      updateData.timeline = oldPartner.timeline || [];
    }

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
    res.status(500).json({
      message: "更新合作夥伴失敗",
      error: error.message,
    });
  }
});

// 刪除合作夥伴
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
    res.status(500).json({
      message: "刪除合作夥伴失敗",
      error: error.message,
    });
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
