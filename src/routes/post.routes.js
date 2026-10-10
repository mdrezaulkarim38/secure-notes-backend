const express = require("express");
const { z } = require("zod");
const Post = require("../models/Post");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

const postSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(2000),
});

router.post("/", async (req, res, next) => {
  try {
    const data = postSchema.parse(req.body);
    const post = await Post.create({
      title: data.title,
      content: data.content,
      userId: req.user.id,
    });
    res.status(201).json(post);
  } catch (error) {
    if (error.name === "ZodError")
      return res.status(400).json({ message: "Invalid input" });
    next(error);
  }
});

module.exports = router;
