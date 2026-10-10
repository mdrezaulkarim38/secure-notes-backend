const mongoose = require("mongoose");
const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 2000 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("Note", noteSchema);
