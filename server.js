const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const Partner = require("./models/partner");
const authRoutes = require("./routes/auth");
const { auth, checkCountryAccess } = require("./middleware/auth");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// 認證路由
app.use("/api/auth", authRoutes);

// 需要認證的 API 路由
app.get("/api/partners", auth, async (req, res) => {
  try {
    let partners;
    if (req.user.role === "admin") {
      partners = await Partner.find();
    } else {
      partners = await Partner.find({
        country: { $in: req.user.assignedCountries },
      });
    }
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/partners", auth, checkCountryAccess, async (req, res) => {
  try {
    const partner = new Partner(req.body);
    const newPartner = await partner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
