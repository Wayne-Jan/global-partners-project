// routes/partners.js

const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const { auth, isAdmin } = require("../middleware/auth");

// 更新進度的輔助函數
async function updateProgressFromTimeline(partner) {
  if (!partner.timeline || partner.timeline.length === 0) {
    // 設置默認進度
    partner.progress = {
      phase: "初步接觸",
      lastUpdate: new Date(),
      details: "初始階段",
    };
    return;
  }

  // 根據日期排序時間軸，獲取最新事件
  const sortedTimeline = [...partner.timeline].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // 更新進度資訊
  if (!partner.progress) {
    partner.progress = {};
  }

  partner.progress.phase = sortedTimeline[0].phase;
  partner.progress.lastUpdate = new Date(sortedTimeline[0].date);
  partner.progress.details = sortedTimeline[0].description || "";
}

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
    console.error("獲取國家列表失敗:", error);
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
    console.error("獲取合作夥伴列表失敗:", error);
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

    // console.log("接收到的新增合作夥伴資料:", req.body); // 日誌記錄

    const initialTimeline = {
      date: new Date(),
      event: "建立合作夥伴",
      description: `初始階段：${req.body.progress.phase}`,
      type: "create",
      phase: req.body.progress.phase,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
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
    console.error("新增合作夥伴失敗:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ message: "新增合作夥伴失敗", error: error.message });
  }
});

// 新增時間軸事件
router.post("/:partnerId/timeline", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { event, description, phase, date } = req.body;

    // 驗證必要欄位
    if (!event || !description || !phase || !date) {
      return res.status(400).json({
        message: "缺少必要欄位",
        details: "事件、描述、階段和日期都是必填的",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    // 檢查是否已存在相同階段的事件
    const existingPhaseEvent = partner.timeline.find(
      (evt) => evt.phase === phase
    );

    // 判斷 type：如果已存在同階段事件則為 update，否則為 create
    const eventType = existingPhaseEvent ? "update" : "create";

    const newTimelineEvent = {
      event,
      description,
      phase,
      date: new Date(date),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      type: eventType,
    };

    partner.timeline.push(newTimelineEvent);

    // 更新進度資訊
    await updateProgressFromTimeline(partner);

    const updatedPartner = await partner.save();

    res.status(201).json({
      message: "時間軸事件已成功新增",
      timeline: updatedPartner.timeline,
      progress: updatedPartner.progress,
    });
  } catch (error) {
    console.error("新增時間軸事件失敗:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "新增時間軸事件失敗",
      error: error.message,
    });
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
      (evt) => evt._id.toString() === eventId
    );

    if (timelineIndex === -1) {
      return res.status(404).json({ message: "找不到此時間軸事件" });
    }

    const originalTimelineEvent = partner.timeline[timelineIndex];
    const originalPhase = originalTimelineEvent.phase;

    // 檢查是否已存在其他相同階段的事件（除了當前事件）
    const existingPhaseEvent = partner.timeline.find(
      (evt) => evt.phase === phase && evt._id.toString() !== eventId
    );

    // 判斷 type：
    // 1. 如果是更改階段，且新階段已存在其他事件，則為 update
    // 2. 如果是更改階段，且新階段不存在其他事件，則為 create
    // 3. 如果沒有更改階段，保持原有的 type
    let newType = originalTimelineEvent.type;
    if (phase !== originalPhase) {
      newType = existingPhaseEvent ? "update" : "create";
    }

    // 更新時間軸事件
    partner.timeline[timelineIndex] = {
      ...originalTimelineEvent.toObject(),
      event,
      description,
      phase,
      date: new Date(date),
      updatedAt: new Date(),
      updatedBy: req.user.userId,
      type: newType,
    };

    // 更新進度資訊
    await updateProgressFromTimeline(partner);

    const updatedPartner = await partner.save();

    res.json({
      message: "時間軸事件已成功更新",
      timeline: updatedPartner.timeline,
      progress: updatedPartner.progress,
    });
  } catch (error) {
    console.error("更新時間軸事件失敗:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
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
        (evt) => evt._id.toString() === eventId
      );

      if (timelineIndex === -1) {
        return res.status(404).json({ message: "找不到此時間軸事件" });
      }

      // 刪除時間軸事件
      partner.timeline.splice(timelineIndex, 1);

      // 更新進度資訊
      await updateProgressFromTimeline(partner);

      const updatedPartner = await partner.save();

      res.json({
        message: "時間軸事件已成功刪除",
        timeline: updatedPartner.timeline,
        progress: updatedPartner.progress,
      });
    } catch (error) {
      console.error("刪除時間軸事件失敗:", error);
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

// 直接更新進度
router.put("/:partnerId/progress", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { phase, lastUpdate } = req.body;

    if (!phase || !lastUpdate) {
      return res.status(400).json({
        message: "缺少必要欄位",
        details: "phase 和 lastUpdate 是必填的",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    // 更新進度資訊
    partner.progress = {
      ...partner.progress,
      phase,
      lastUpdate: new Date(lastUpdate),
      details: req.body.details || partner.progress.details,
    };

    // 新增對應的時間軸事件
    const timelineEvent = {
      event: `階段更新：${phase}`,
      description: req.body.details || "進度已更新",
      phase,
      date: new Date(lastUpdate),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      type: "update",
    };

    partner.timeline.push(timelineEvent);

    const updatedPartner = await partner.save();

    res.json({
      message: "進度已成功更新",
      progress: updatedPartner.progress,
      timeline: updatedPartner.timeline,
    });
  } catch (error) {
    console.error("更新進度失敗:", error);
    res.status(500).json({
      message: "更新進度失敗",
      error: error.message,
    });
  }
});

// 新增資源
router.post("/:partnerId/resources", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { title, type, content, url } = req.body;

    // 驗證必要欄位
    if (!title || !type || !content) {
      return res.status(400).json({
        message: "缺少必要欄位",
        details: "title、type 和 content 是必填的",
      });
    }

    // 如果 type 是 'link'，則 url 是必填的
    if (type === "link" && !url) {
      return res.status(400).json({
        message: "缺少必要欄位",
        details: "type 為 'link' 時，url 是必填的",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    const newResource = {
      title,
      type,
      content,
      url: type === "link" ? url : undefined,
      order: partner.resources.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    };

    partner.resources.push(newResource);
    const updatedPartner = await partner.save();

    res.status(201).json({
      message: "資源已成功新增",
      resources: updatedPartner.resources,
    });
  } catch (error) {
    console.error("新增資源失敗:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "新增資源失敗",
      error: error.message,
    });
  }
});

// 更新資源
router.put(
  "/:partnerId/resources/:resourceId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { partnerId, resourceId } = req.params;
      const { title, type, content, url } = req.body;

      // 驗證必要欄位
      if (!title || !type || !content) {
        return res.status(400).json({
          message: "缺少必要欄位",
          details: "title、type 和 content 是必填的",
        });
      }

      // 如果 type 是 'link'，則 url 是必填的
      if (type === "link" && !url) {
        return res.status(400).json({
          message: "缺少必要欄位",
          details: "type 為 'link' 時，url 是必填的",
        });
      }

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "找不到此合作夥伴" });
      }

      const resourceIndex = partner.resources.findIndex(
        (resource) => resource._id.toString() === resourceId
      );

      if (resourceIndex === -1) {
        return res.status(404).json({ message: "找不到此資源" });
      }

      const originalResource = partner.resources[resourceIndex];

      partner.resources[resourceIndex] = {
        ...originalResource.toObject(),
        title,
        type,
        content,
        url: type === "link" ? url : undefined,
        updatedAt: new Date(),
        updatedBy: req.user.userId,
      };

      const updatedPartner = await partner.save();

      res.json({
        message: "資源已成功更新",
        resources: updatedPartner.resources,
      });
    } catch (error) {
      console.error("更新資源失敗:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "資料驗證失敗",
          details: Object.values(error.errors).map((err) => err.message),
        });
      }
      res.status(500).json({
        message: "更新資源失敗",
        error: error.message,
      });
    }
  }
);

// 刪除資源
router.delete(
  "/:partnerId/resources/:resourceId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { partnerId, resourceId } = req.params;
      const partner = await Partner.findById(partnerId);

      if (!partner) {
        return res.status(404).json({ message: "找不到此合作夥伴" });
      }

      if (!partner.resources || !Array.isArray(partner.resources)) {
        return res.status(400).json({ message: "資源資料格式錯誤" });
      }

      const resourceIndex = partner.resources.findIndex(
        (resource) => resource._id.toString() === resourceId
      );

      if (resourceIndex === -1) {
        return res.status(404).json({ message: "找不到此資源" });
      }

      // 刪除資源
      partner.resources.splice(resourceIndex, 1);

      // 重新排序剩餘資源
      partner.resources = partner.resources.map((resource, index) => ({
        ...resource.toObject(),
        order: index,
      }));

      const updatedPartner = await partner.save();

      res.json({
        message: "資源已成功刪除",
        resources: updatedPartner.resources,
      });
    } catch (error) {
      console.error("刪除資源失敗:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ message: "無效的ID格式" });
      }
      res.status(500).json({
        message: "刪除資源失敗",
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
    console.error("獲取合作夥伴資訊失敗:", error);
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

    // console.log("接收到的更新合作夥伴資料:", req.body); // 日誌記錄

    // 處理資源更新時間
    if (req.body.resources) {
      req.body.resources = req.body.resources.map((resource) => ({
        ...resource,
        createdAt: resource.createdAt || new Date(),
        updatedAt: new Date(),
        updatedBy: req.user.userId,
      }));
    }

    const isProgressChanged =
      oldPartner.progress.phase !== req.body.progress.phase;
    const updateData = {
      ...req.body,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    };

    // 如果沒有提供 timeline，保留原有的 timeline
    if (!updateData.timeline) {
      updateData.timeline = oldPartner.timeline || [];
    }

    if (isProgressChanged) {
      const timelineEntry = {
        date: new Date(),
        event: `階段更新：${req.body.progress.phase}`,
        description: req.body.progress.details || "",
        type: "update",
        phase: req.body.progress.phase,
        createdBy: req.user.userId,
        updatedBy: req.user.userId,
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
    console.error("更新合作夥伴失敗:", error);
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
    console.error("刪除合作夥伴失敗:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "無效的合作夥伴ID" });
    }
    res.status(500).json({
      message: "刪除合作夥伴失敗",
      error: error.message,
    });
  }
});

// 重新排序資源
router.put("/:partnerId/resources/reorder", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { resourceIds } = req.body; // 期望收到資源ID的新順序陣列

    if (!Array.isArray(resourceIds)) {
      return res.status(400).json({
        message: "提供的資源ID應為陣列",
        details: "resourceIds 必須是一個包含資源ID的陣列",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    // 驗證所有提供的資源ID是否存在
    const validResourceIds = partner.resources.map((r) => r._id.toString());
    const allIdsValid = resourceIds.every((id) =>
      validResourceIds.includes(id)
    );

    if (!allIdsValid) {
      return res.status(400).json({ message: "提供的資源ID包含無效值" });
    }

    // 根據新順序重新排列資源
    const reorderedResources = resourceIds.map((id, index) => {
      const resource = partner.resources.find((r) => r._id.toString() === id);
      return {
        ...resource.toObject(),
        order: index,
      };
    });

    partner.resources = reorderedResources;
    const updatedPartner = await partner.save();

    res.json({
      message: "資源順序已成功更新",
      resources: updatedPartner.resources,
    });
  } catch (error) {
    console.error("重新排序資源失敗:", error);
    res.status(500).json({
      message: "重新排序資源失敗",
      error: error.message,
    });
  }
});

// 建立聯絡人
router.post("/:partnerId/contacts", auth, isAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { name, title, email, phone } = req.body;

    // 驗證必要欄位
    if (!name || !title || !email) {
      return res.status(400).json({
        message: "缺少必要欄位",
        details: "name、title 和 email 是必填的",
      });
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Email 格式不正確",
        details: "請提供有效的電子郵件地址",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    const newContact = {
      name,
      title,
      email,
      phone,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    };

    partner.contacts.push(newContact);
    const updatedPartner = await partner.save();

    res.status(201).json({
      message: "聯絡人已成功新增",
      contacts: updatedPartner.contacts,
    });
  } catch (error) {
    console.error("新增聯絡人失敗:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "資料驗證失敗",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "新增聯絡人失敗",
      error: error.message,
    });
  }
});

// 更新聯絡人
router.put(
  "/:partnerId/contacts/:contactId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { partnerId, contactId } = req.params;
      const { name, title, email, phone } = req.body;

      // 驗證必要欄位
      if (!name || !title || !email) {
        return res.status(400).json({
          message: "缺少必要欄位",
          details: "name、title 和 email 是必填的",
        });
      }

      // 驗證 email 格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: "Email 格式不正確",
          details: "請提供有效的電子郵件地址",
        });
      }

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "找不到此合作夥伴" });
      }

      const contactIndex = partner.contacts.findIndex(
        (contact) => contact._id.toString() === contactId
      );

      if (contactIndex === -1) {
        return res.status(404).json({ message: "找不到此聯絡人" });
      }

      // 保留原有ID和創建資訊
      const originalContact = partner.contacts[contactIndex];
      partner.contacts[contactIndex] = {
        ...originalContact.toObject(),
        name,
        title,
        email,
        phone,
        updatedAt: new Date(),
        updatedBy: req.user.userId,
      };

      const updatedPartner = await partner.save();

      res.json({
        message: "聯絡人已成功更新",
        contacts: updatedPartner.contacts,
      });
    } catch (error) {
      console.error("更新聯絡人失敗:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "資料驗證失敗",
          details: Object.values(error.errors).map((err) => err.message),
        });
      }
      res.status(500).json({
        message: "更新聯絡人失敗",
        error: error.message,
      });
    }
  }
);

// 刪除聯絡人
router.delete(
  "/:partnerId/contacts/:contactId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { partnerId, contactId } = req.params;

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "找不到此合作夥伴" });
      }

      const contactIndex = partner.contacts.findIndex(
        (contact) => contact._id.toString() === contactId
      );

      if (contactIndex === -1) {
        return res.status(404).json({ message: "找不到此聯絡人" });
      }

      // 刪除聯絡人
      partner.contacts.splice(contactIndex, 1);
      const updatedPartner = await partner.save();

      res.json({
        message: "聯絡人已成功刪除",
        contacts: updatedPartner.contacts,
      });
    } catch (error) {
      console.error("刪除聯絡人失敗:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ message: "無效的ID格式" });
      }
      res.status(500).json({
        message: "刪除聯絡人失敗",
        error: error.message,
      });
    }
  }
);

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
