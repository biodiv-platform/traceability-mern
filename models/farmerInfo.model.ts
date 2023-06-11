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
  farmerId: {
    type: String,
    required: true,
  },
  farmerName: {
    type: String,
    required: true,
  },
  village: {
    type: String,
  },
  collectionCenter: {
    type: String,
  },
  cooperative: {
    type: String,
  },
  region: {
    type: String,
  },
});

const FarmerInfo = mongoose.model("FarmerInfo", FarmerInfoSchema);

module.exports = FarmerInfo;
export {};
