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
    //TODO: check if this can be removed as modalFieldArr is already added
    type: Array,
  },
  lotId: {
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
});

const BatchInfo = mongoose.model("BatchInfo", batchInfoSchema);

module.exports = BatchInfo;
export {};
