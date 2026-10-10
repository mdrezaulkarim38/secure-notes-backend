const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
app.set("trust proxy", 1);
const authRoutes = require("./routes/auth.routes");
const noteRoutes = require("./routes/note.routes");
const adminRoutes = require("./routes/admin.routes");
const aggregationRoutes = require("./routes/aggregation.routes");
const postRoutes = require("./routes/post.routes");
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL?.split(",") || true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", aggregationRoutes);
app.use("/api/posts", postRoutes);

app.use(require("./middleware/errorHandler"));
module.exports = app;
