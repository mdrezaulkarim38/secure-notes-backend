const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL?.split(",") || true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);
app.use(require("./middleware/errorHandler"));
module.exports = app;
