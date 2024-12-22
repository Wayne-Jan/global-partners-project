const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    assignedCountries: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// 密碼加密
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 驗證密碼
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// 創建預設管理員帳號
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    console.log("檢查管理員是否存在:", adminExists);

    if (!adminExists) {
      const admin = await User.create({
        username: "admin",
        password: "admin",
        role: "admin",
        assignedCountries: ["*"],
      });
      console.log("成功創建預設管理員:", admin);
    }
  } catch (error) {
    console.error("創建預設管理員錯誤:", error);
  }
};

// 在模型創建後調用創建預設管理員函數
createDefaultAdmin();

module.exports = User;
