const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FarmerProduceInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  farmerProduceId: {
    type: String,
    required: true
  },
  farmerId: {
    type: String
  },
  farmerName: {
    type: String,
    required: true
  },
  contactNo: {
    type: String
  },
  produceType: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  noOfBags: {
    type: Number
  },
  deduction: {
    type: Number
  },
  deductionReason: {
    type: String
  },
  netCollection: {
    type: Number
  },
  pricePerKg: {
    type: Number
  },
  amountPaidCalculate: {
    type: Number
  },
  millingCharge: {
    type: Number
  },
  dateOfCollection: {
    type: Date
  },
  collectorName: {
    type: String
  },
  collectorSubstr: {
    type: String
  },
  calculateGrn: {
    type: String
  },
  location: {
    type: Object
  },
  // grnNumber: {
  //   type: String
  // },
  grnReceipt: {
    // grn receipt image
    type: String
  },

  // meta fields
  farmerEID: {
    // farmer entity id
    type: String,
    required: true
  },
  instanceID: {
    type: String
  },
  instanceName: {
    type: String
  },
  submittedOnODK: {
    type: Date
  },
  submitterName: {
    type: String
  },
  formVersion: {
    type: String
  },
  reviewState: {
    type: String
  },
  edits: {
    type: Number
  },
  // extra fields(check if needed)
  batchId: {
    type: String
  },
  batchIdMongo: {
    type: String
  },
  // cropcert entities fields
  ccCode: {
    type: Number
  },
  coCode: {
    type: Number
  },
  unionCode: {
    type: Number
  },
  flag: {
    type: Boolean,
    default: false,
    required: true
  },
  flagReason: {
    type: Array
  },
  // cropcert traceability fields
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
