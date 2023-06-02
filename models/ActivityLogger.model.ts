const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ActivityLoggerSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  lotId: {
    type: String,
    // required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  type: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const ActivityLogger = mongoose.model("ActivityLogger", ActivityLoggerSchema);

module.exports = ActivityLogger;
export {};
