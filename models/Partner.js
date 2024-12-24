// models/Partner.js
const mongoose = require("mongoose");

const timelineSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  event: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  phase: {
    type: String,
    required: true,
    enum: [
      "初步接觸",
      "確認合作項目",
      "場地勘查",
      "設備部署",
      "數據收集",
      "分析與優化",
      "完成階段",
    ],
  },
  type: {
    type: String,
    enum: ["create", "update", "delete"],
    default: "create",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const partnerSchema = new mongoose.Schema(
  {
    country: {
      code: { type: String, required: true }, // 國家代碼，如 TW, US
      name: { type: String, required: true }, // 國家名稱
      flag: { type: String, required: true }, // 國旗 emoji
    },
    institution: {
      name: { type: String, required: true }, // 機構名稱
      department: String, // 部門（選填）
    },
    project: {
      name: {
        type: String,
        required: true,
        enum: [
          "子計畫三",
          "子計畫四",
          "子計畫五",
          "子計畫六",
          "子計畫七",
          "子計畫八",
          "子計畫九",
        ],
      },
      content: {
        type: String,
        required: false, // 設為非必填
      },
    },
    progress: {
      phase: {
        type: String,
        required: true,
        enum: [
          "初步接觸",
          "確認合作項目",
          "場地勘查",
          "設備部署",
          "數據收集",
          "分析與優化",
          "完成階段",
        ],
      },
      details: String, // 進度詳細說明
      lastUpdate: {
        // 最後更新時間
        type: Date,
        default: Date.now,
      },
    },
    resources: [
      {
        title: String,
        content: String,
        url: String,
        type: {
          type: String,
          enum: ["text", "link", "note"],
          default: "text",
        },
        order: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    contacts: [
      {
        // 聯絡人（可多個）
        name: String, // 姓名
        title: String, // 職稱
        email: String, // Email
        phone: String, // 電話（選填）
      },
    ],
    timeline: [timelineSchema], // 新增的時間軸屬性
    createdBy: {
      // 建立者
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      // 最後更新者
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // 自動管理 createdAt 和 updatedAt
  }
);

module.exports = mongoose.model("Partner", partnerSchema);
