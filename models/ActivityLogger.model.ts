const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ActivityLoggerSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  lotId: {
    type: String
  },
  batchId: {
    type: String
  },
  userId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: new Date().toISOString()
  },
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  activityFor: {
    type: String,
    required: true
  }
})

const ActivityLogger = mongoose.model('ActivityLogger', ActivityLoggerSchema)

module.exports = ActivityLogger
export {}
