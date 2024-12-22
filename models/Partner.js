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
      enum: [
        "確認落地場域國家與技術項目",
        "試驗儀器與環境部屬",
        "數據收集與分析",
        "模型優化與微調",
        "完成",
      ], // 根據您的需求添加或修改階段
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
          enum: ["合約", "報告", "提案", "其他"], // 可以根據需求修改文件類型
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
          match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "請輸入有效的電子郵件地址",
          ],
        },
      },
    ],
    status: {
      type: String,
      enum: ["活躍", "暫停", "結束"],
      default: "活躍",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 添加索引以提升查詢效能
partnerSchema.index({ country: 1 });
partnerSchema.index({ status: 1 });
partnerSchema.index({ "contacts.email": 1 });

// 添加虛擬屬性來獲取最新進度
partnerSchema.virtual("latestUpdate").get(function () {
  if (this.progressUpdates && this.progressUpdates.length > 0) {
    return this.progressUpdates[this.progressUpdates.length - 1];
  }
  return null;
});

// 添加方法來檢查合作狀態
partnerSchema.methods.isActive = function () {
  return this.status === "活躍";
};

// 添加靜態方法來查詢特定國家的合作夥伴
partnerSchema.statics.findByCountry = function (country) {
  return this.find({ country: country });
};

// 查詢活躍的合作夥伴
partnerSchema.statics.findActive = function () {
  return this.find({ status: "活躍" });
};

// 在保存前的驗證
partnerSchema.pre("save", function (next) {
  // 確保 email 都轉換為小寫
  if (this.contacts) {
    this.contacts.forEach((contact) => {
      contact.email = contact.email.toLowerCase();
    });
  }
  next();
});

const Partner = mongoose.model("Partner", partnerSchema);

module.exports = Partner;
