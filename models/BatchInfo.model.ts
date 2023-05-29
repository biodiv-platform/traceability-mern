const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const batchInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
  },
  batchName: {
    type: String,
    required: true,
  },
  initialQuantity: {
    type: Number,
    required: true,
  },
  batchColumnValues: {
    type: Array,
  },
});

const BatchInfo = mongoose.model("BatchInfo", batchInfoSchema);

module.exports = BatchInfo;
export {};
