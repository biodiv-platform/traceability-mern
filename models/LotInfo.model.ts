const mongoose = require('mongoose')

const Schema = mongoose.Schema

const lotInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  lotName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  coCode: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  lotStatus: {
    type: String,
    required: true
  },
  modalFieldCombined: {
    type: Array,
    required: true
  },
  lotId: {
    type: String,
    required: true
  },
  batchIds: {
    type: Array,
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
  }
})

const LotInfo = mongoose.model('LotInfo', lotInfoSchema)

module.exports = LotInfo
export {}
