const mongoose = require('mongoose')

const Schema = mongoose.Schema

const lotInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  id: {
    type: Number,
    required: true
  },
  lotName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'wugar',
      'kibiko',
      'faq',
      'faq_sc18',
      'faq_sc15',
      'faq_sc12',
      'faq_bhp',
      'faq_ug'
    ],
    required: true
  },
  coCode: {
    type: Array,
    required: true
  },
  ccCode: {
    type: Array,
    required: true
  },
  unionCode: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  lotStatus: {
    type: String,
    enum: [
      'container_created',
      'pending',
      'ready_for_container',
      'sub_lot_created'
    ],
    required: true
  },
  lotCategory: {
    type: String,
    enum: ['lot', 'sub_lot', 'remaining_lot']
  },
  isReadyForContainer: {
    type: Boolean,
    default: false,
    required: true
  },
  isSubLotCreated: {
    type: Boolean,
    default: false,
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
  containerId: {
    type: String
  },
  batchIds: {
    type: Array,
    required: true
  },
  farmerProduceIds: {
    type: Array,
    required: true
  },
  note: {
    type: String
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
