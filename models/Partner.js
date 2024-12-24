// models/Partner.js
const mongoose = require("mongoose");

// 定義時間軸 Schema
const timelineSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  event: { type: String, required: true },
  description: { type: String },
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// 定義資源 Schema
const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  url: {
    type: String,
    required: function () {
      return this.type === "link";
    },
    validate: {
      validator: function (v) {
        if (this.type === "link") {
          return /^https?:\/\/.+\..+/.test(v);
        }
        return true;
      },
      message: (props) => `${props.value} 不是一個有效的 URL！`,
    },
  },
  type: {
    type: String,
    enum: ["text", "link", "note"],
    default: "text",
  },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// 定義聯絡人 Schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  email: {
    type: String,
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "請提供一個有效的電子郵件地址"],
  },
  phone: { type: String },
});

// 定義主要的 Partner Schema
const partnerSchema = new mongoose.Schema(
  {
    country: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      flag: { type: String, required: true },
    },
    institution: {
      name: { type: String, required: true },
      department: { type: String },
    },
    project: {
      subProject: {
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
      name: { type: String, required: true }, // 自訂合作項目名稱
      content: { type: String },
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
      details: { type: String },
      lastUpdate: { type: Date, default: Date.now },
    },
    resources: [resourceSchema],
    contacts: [contactSchema],
    timeline: [timelineSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Partner", partnerSchema);
