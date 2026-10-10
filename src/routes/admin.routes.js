const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Note = require("../models/Note");
const Post = require("../models/Post");
const authenticate = require("../middleware/authenticate");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const { getPagination } = require("../utils/pagination");

const router = express.Router();

router.use(authenticate, authorizeAdmin);

function safe(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    interests: u.interests,
    createdAt: u.createdAt,
  };
}

router.get("/users", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [items, total] = await Promise.all([
      User.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    res.json({
      items: items.map(safe),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(200),
  role: z.enum(["User", "Admin"]).optional().default("User"),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
});

router.post("/users", async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(d.password, 10);
    const u = await User.create({
      name: d.name,
      email: d.email,
      passwordHash,
      role: d.role,
      interests: [...new Set(d.interests.map((s) => s.toLowerCase()))],
    });
    res.status(201).json(safe(u));
  } catch (e) {
    if (e && e.code === 11000) return res.status(400).json({ message: "Email already in use" });
    if (e && e.name === "ZodError") return res.status(400).json({ message: "Invalid input" });
    next(e);
  }
});

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    role: z.enum(["User", "Admin"]).optional(),
  })
  .strict();

router.patch("/users/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const d = patchSchema.parse(req.body);
    if (d.interests) d.interests = [...new Set(d.interests.map((s) => s.toLowerCase()))];
    const u = await User.findByIdAndUpdate(req.params.id, { $set: d }, { returnDocument: "after" });
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json(safe(u));
  } catch (e) {
    if (e && e.name === "ZodError") return res.status(400).json({ message: "Invalid input" });
    next(e);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ message: "User not found" });
    await Promise.all([Note.deleteMany({ userId: u._id }), Post.deleteMany({ userId: u._id })]);
    res.json({ message: "User deleted" });
  } catch (e) {
    next(e);
  }
});

router.get("/notes", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [items, total] = await Promise.all([
      Note.find()
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email"),
      Note.countDocuments(),
    ]);
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
