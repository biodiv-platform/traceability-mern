const mongoose = require('mongoose')

const Schema = mongoose.Schema

const batchInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
    // required: true, //TODO: check if this is required
  },
  id: {
    type: Number,
    required: true
  },
  batchName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  lotId: {
    type: String
  },
  lotIdMongo: {
    type: String
  },
  lotStatus: {
    type: String
  },
  isReadyForLot: {
    type: Boolean,
    default: false,
    required: true
  },
  batchStatus: {
    type: String,
    required: true
  },
  modalFieldCombined: {
    type: Array,
    required: true
  },
  ccCode: {
    type: Array,
    required: true
  },
  coCode: {
    type: Array,
    required: true
  },
  unionCode: {
    type: Number,
    required: true
  },
  note: {
    type: String
  },
  type: {
    type: String,
    required: true
  },
  batchId: {
    type: String,
    required: true
  },
  farmerProduceIds: {
    type: Array,
    required: true
  },
  flag: {
    type: Boolean,
    default: false,
    required: true
  },
  flagReason: {
    type: Array
  },
  createdAt: {
    type: Date,
    default: new Date().toISOString(),
    required: true
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

const BatchInfo = mongoose.model('BatchInfo', batchInfoSchema)

module.exports = BatchInfo
export {}
