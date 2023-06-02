const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const batchInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    // required: true, //TODO: check if this is required
  },
  batchName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  batchColumnValues: {
    type: Array,
  },
  lotId: {
    type: String,
  },
});

const BatchInfo = mongoose.model("BatchInfo", batchInfoSchema);

module.exports = BatchInfo;
export {};
