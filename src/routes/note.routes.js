const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const authenticate = require("../middleware/authenticate");
const { getPagination } = require("../utils/pagination");
const router = express.Router();
router.use(authenticate);

const noteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(2000),
});

router.post("/", async (req, res, next) => {
  try {
    const data = noteSchema.parse(req.body);
    const note = await Note.create({
      title: data.title,
      content: data.content,
      userId: req.user.id,
    });
    res.status(201).json(note);
  } catch (error) {
    if (error.name === "ZodError")
      return res.status(400).json({ message: "Invalid input" });
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const f = { userId: req.user.id };
    const [items, total] = await Promise.all([
      Note.find(f)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(f),
    ]);
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

function checkId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "Invalid id" });
    return null;
  }
  return true;
}

router.get("/:id", async (req, res, next) => {
  try {
    if (!checkId(req, res)) return;
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!checkId(req, res)) return;
    const data = noteSchema.partial().parse(req.body);
    if (Object.keys(data).length === 0)
      return res.status(400).json({ message: "Invalid input" });
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: data },
      { returnDocument: "after" },
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    if (error.name === "ZodError")
      return res.status(400).json({ message: "Invalid input" });
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!checkId(req, res)) return;
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
