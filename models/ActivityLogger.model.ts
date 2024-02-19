const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ActivityLoggerSchema = new Schema({
  authorId: {
    type: String,
    required: true
  },
  dateCreated: {
    type: Date,
    required: true,
    default: new Date().toISOString()
  },
  activityType: {
    type: String,
    required: true
  },
  activityDescription: {
    type: String
  },
  activityHolderId: {
    type: String,
    required: true
  },
  activityHolderType: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: new Date().toISOString()
  },
  rootHolderId: {
    type: String
  },
  rootHolderType: {
    type: String
  },
  subRootHolderId: {
    type: String
  },
  subRootHolderType: {
    type: String
  },
  isShowable: {
    type: Boolean,
    default: true
  }
})

const ActivityLogger = mongoose.model('ActivityLogger', ActivityLoggerSchema)

module.exports = ActivityLogger
export {}
