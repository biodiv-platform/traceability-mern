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
  lotId: {
    type: String,
  },
  lotStatus: {
    type: String,
  },
  isReadyForLot: {
    type: Boolean,
    default: false,
    required: true,
  },
  batchStatus: {
    type: String,
    required: true,
  },
  modalFieldCombined: {
    type: Array,
    required: true,
  },
  ccCode: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  lastUpdatedOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  batchId: {
    type: String,
    required: true,
  },
  farmerProduceIds: {
    type: Array,
    required: true,
  },
});

const BatchInfo = mongoose.model("BatchInfo", batchInfoSchema);

module.exports = BatchInfo;
export {};
