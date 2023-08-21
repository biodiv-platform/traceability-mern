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
  createdOn: {
    type: Date,
    default: new Date(),
    required: true
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false
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
  }
})

const LotInfo = mongoose.model('LotInfo', lotInfoSchema)

module.exports = LotInfo
export {}
