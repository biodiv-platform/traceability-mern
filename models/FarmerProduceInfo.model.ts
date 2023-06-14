const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const FarmerProduceInfoSchema = new Schema({
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
  farmerProduceId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  collectionCenter: {
    type: String,
    required: true,
  },
  cooperative: {
    type: String,
    required: true,
  },
  batchId: {
    type: String,
  },
  batchIdMongo: {
    type: String,
  },
  farmerName: {
    type: String,
  },
  marketingManagerName: {
    type: String, //TODO: check if this is required
  },
});

const FarmerProduceInfo = mongoose.model(
  "FarmerProduceinfo",
  FarmerProduceInfoSchema
);

module.exports = FarmerProduceInfo;
export {};
