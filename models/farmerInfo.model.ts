const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const FarmerInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  collectionDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  quantity: {
    type: Number,
    required: true,
  },
});

const FarmerInfo = mongoose.model("FarmerInfo", FarmerInfoSchema);

module.exports = FarmerInfo;
export {};
