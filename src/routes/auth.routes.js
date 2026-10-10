const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, try again later" },
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(200),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

function safeUser(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    interests: u.interests,
    createdAt: u.createdAt,
  };
}

// POST /api/auth/register — always creates role=User, ignores any client role
router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const interests = [...new Set((data.interests || []).map((s) => s.toLowerCase()))];
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: "User",
      interests,
    });
    res.status(201).json(safeUser(user));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (err && err.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", details: err.issues });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email }).select("+passwordHash");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    if (err && err.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", details: err.issues });
    }
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
