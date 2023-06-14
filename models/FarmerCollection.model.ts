const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const FarmerCollectionSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  collectionDate: {
    type: Date,
    required: true,
    default: new Date(),
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
  label: {
    type: String,
  },
  ccId: {
    type: String,
  },
  coopId: {
    type: String,
  },
  farmerProduceIds: {
    type: Array,
  },
});

const FarmerCollection = mongoose.model(
  "farmerscollection",
  FarmerCollectionSchema
);

module.exports = FarmerCollection;
export {};
