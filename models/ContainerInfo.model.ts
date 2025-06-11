import { CoffeeTypesArray } from '../interfaces/traceability'
import mongoose from 'mongoose'

const Schema = mongoose.Schema

const containerInfoSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  id: {
    type: Number,
    required: true
  },
  containerName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: CoffeeTypesArray,
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
  containerStatus: {
    type: String,
    required: true
  },
  modalFieldCombined: {
    type: Array,
    required: true
  },
  isReadyToSold: {
    type: Boolean
  },
  maxWeight: {
    type: Number
  },
  containerId: {
    type: String,
    required: true
  },
  lotIds: {
    type: Array,
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

const ContainerInfo = mongoose.model('ContainerInfo', containerInfoSchema)

module.exports = ContainerInfo
export {}
