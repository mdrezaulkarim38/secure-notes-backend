const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const { getPagination } = require("../utils/pagination");
const router = express.Router();

router.get(
  "/admin/users-by-interest",
  authenticate,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const result = await User.aggregate([
        { $unwind: "$interests" },
        {
          $group: {
            _id: "$interests",
            users: { $push: { id: "$_id", name: "$name", email: "$email" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
      ]);
      const data = result[0] || { items: [], total: [] };
      const total = data.total[0] ? data.total[0].count : 0;
      res.json({
        items: data.items.map((g) => ({
          interest: g._id,
          users: g.users,
          count: g.count,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/users/:id/posts", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const { page, limit, skip } = getPagination(req.query);
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const result = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: "posts",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            {
              $facet: {
                items: [{ $skip: skip }, { $limit: limit }],
                total: [{ $count: "count" }],
              },
            },
          ],
          as: "postData",
        },
      },
      { $project: { name: 1, email: 1, postData: 1 } },
    ]);
    if (!result[0]) return res.status(404).json({ message: "User not found" });
    const postData = result[0].postData[0] || { items: [], total: [] };
    const total = postData.total[0] ? postData.total[0].count : 0;
    res.json({
      user: { id: result[0]._id, name: result[0].name, email: result[0].email },
      items: postData.items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
