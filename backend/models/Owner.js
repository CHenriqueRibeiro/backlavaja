const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone:{
    type:Number,
    required: true
  },
  establishments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establishment",
    }
  ],
}, {
  timestamps: true,
});

const Owner = mongoose.model("Owner", ownerSchema);
module.exports = Owner;
