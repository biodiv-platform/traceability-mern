const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FarmerProduceInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  farmerId: {
    type: String,
    required: true
  },
  farmerProduceId: {
    type: String,
    required: true
  },
  farmerName: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  collectorName: {
    type: String,
    required: true
  },
  odkCollectionDate: {
    type: Date
  },
  noOfBags: {
    type: Number
  },
  grnNumber: {
    type: String
  },
  grnReceipt: {
    type: String
  },
  batchId: {
    type: String
  },
  batchIdMongo: {
    type: String
  },
  ccCode: {
    type: Number
  },
  coCode: {
    type: Number
  },
  unionCode: {
    type: Number
  },
  metadata: {
    type: Object
  },
  createdAt: {
    type: Date,
    required: true,
    default: new Date().toISOString()
  },
  lastUpdatedAt: {
    type: Date,
    default: new Date().toISOString(),
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  } // for soft delete
})

const FarmerProduceInfo = mongoose.model(
  'FarmerProduceinfo',
  FarmerProduceInfoSchema
)

module.exports = FarmerProduceInfo
export {}
