const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const { auth, isAdmin } = require("../middleware/auth");

// 獲取所有合作夥伴列表
router.get("/", async (req, res) => {
  try {
    const partners = await Partner.find().select("-contacts -sites");
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
});

// 新增合作夥伴 (需要管理員權限)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const partner = new Partner({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    const newPartner = await partner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 更新合作夥伴資訊 (需要管理員權限)
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }

    Object.assign(partner, req.body);
    partner.updatedBy = req.user._id;
    const updatedPartner = await partner.save();
    res.json(updatedPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 刪除合作夥伴 (需要管理員權限)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "找不到此合作夥伴" });
    }
    await partner.remove();
    res.json({ message: "已成功刪除" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 取得國家列表
router.get("/utils/countries", auth, async (req, res) => {
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
});

module.exports = router;
