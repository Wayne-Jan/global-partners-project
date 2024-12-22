const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const { auth } = require("../middleware/auth");

// 獲取儀表板統計資料
router.get("/stats", auth, async (req, res) => {
  try {
    // 使用聚合管道來優化查詢效能
    const stats = await Partner.aggregate([
      {
        $facet: {
          // 計算總合作夥伴數量
          totalCount: [{ $count: "count" }],
          // 計算各階段的專案數量
          phaseStats: [
            {
              $group: {
                _id: "$phase",
                count: { $sum: 1 },
              },
            },
          ],
          // 計算各狀態的合作夥伴數量
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          // 獲取最新更新時間
          latestUpdates: [
            {
              $unwind: {
                path: "$progressUpdates",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: null,
                lastUpdate: { $max: "$progressUpdates.date" },
                lastSystemUpdate: { $max: "$updatedAt" },
              },
            },
          ],
        },
      },
    ]);

    // 處理統計結果
    const result = stats[0];
    const totalPartners = result.totalCount[0]?.count || 0;

    // 計算進行中的專案數量（排除「完成」階段）
    const activeProjects = result.phaseStats.reduce((sum, phase) => {
      return phase._id !== "完成" ? sum + phase.count : sum;
    }, 0);

    // 取得最後更新時間
    const latestUpdate = result.latestUpdates[0];
    const lastUpdate = latestUpdate
      ? new Date(
          Math.max(
            new Date(latestUpdate.lastUpdate || 0),
            new Date(latestUpdate.lastSystemUpdate || 0)
          )
        )
      : new Date();

    // 按狀態分類的合作夥伴數量
    const statusCounts = result.statusStats.reduce((acc, status) => {
      acc[status._id] = status.count;
      return acc;
    }, {});

    // 按階段分類的專案數量
    const phaseCounts = result.phaseStats.reduce((acc, phase) => {
      acc[phase._id] = phase.count;
      return acc;
    }, {});

    // 返回更詳細的統計資料
    res.json({
      summary: {
        totalPartners,
        activeProjects,
        lastUpdate,
      },
      details: {
        byStatus: statusCounts,
        byPhase: phaseCounts,
      },
    });
  } catch (error) {
    console.error("儀表板統計錯誤:", error);
    res.status(500).json({ message: "獲取儀表板資料失敗" });
  }
});

module.exports = router;
