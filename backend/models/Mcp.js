const mongoose = require("mongoose");

const McpSessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    step: { type: String, required: true },
    service: { type: Object },
    day: { type: String },
    hour: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("McpSession", McpSessionSchema);
