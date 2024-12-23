const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "使用者名稱為必填欄位"],
      unique: true,
      trim: true,
      minlength: [4, "使用者名稱至少需要4個字元"],
      maxlength: [20, "使用者名稱不能超過20個字元"],
    },
    password: {
      type: String,
      required: [true, "密碼為必填欄位"],
      minlength: [6, "密碼至少需要6個字元"],
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "user"],
        message: "角色必須是 admin 或 user",
      },
      default: "user",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "請輸入有效的電子郵件地址",
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    assignedCountries: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],
    name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// 密碼加密
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    if (this.password.length < 6) {
      throw new Error("密碼至少需要6個字元");
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密碼驗證方法
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("密碼驗證失敗");
  }
};

// 更新最後登入時間
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return await this.save();
};

// 檢查用戶是否有特定國家的權限
userSchema.methods.hasCountryAccess = function (countryCode) {
  return (
    this.role === "admin" ||
    this.assignedCountries.includes("*") ||
    this.assignedCountries.includes(countryCode.toUpperCase())
  );
};

const User = mongoose.model("User", userSchema);

// // 創建預設管理員
// const createDefaultAdmin = async () => {
//   try {
//     const adminExists = await User.findOne({ username: "admin" });

//     if (!adminExists) {
//       const adminData = {
//         username: "admin",
//         password: process.env.DEFAULT_ADMIN_PASSWORD || "admin",
//         role: "admin",
//         email: process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com",
//         assignedCountries: ["*"],
//         name: "系統管理員",
//       };

//       const admin = await User.create(adminData);
//       console.log("成功創建預設管理員:", {
//         username: admin.username,
//         role: admin.role,
//         id: admin._id,
//       });
//     }
//   } catch (error) {
//     console.error("創建預設管理員失敗:", error);
//   }
// };

// 在非測試環境下執行初始化
if (process.env.NODE_ENV !== "test") {
  createDefaultAdmin();
}

module.exports = User;
