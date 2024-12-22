const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: false,
    },
    phase: {
      type: String,
      required: true,
    },
    progressUpdates: [
      {
        date: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          required: true,
          enum: ["進行中", "已完成", "待處理"],
        },
        description: String,
      },
    ],
    documents: [
      {
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        date: {
          type: String,
          required: true,
        },
      },
    ],
    contacts: [
      {
        name: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Partner = mongoose.model("Partner", partnerSchema);

module.exports = Partner;
