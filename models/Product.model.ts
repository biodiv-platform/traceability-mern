const mongoose = require('mongoose')

const Schema = mongoose.Schema

const productSchema = new Schema({
  productName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  lastFetchedTime: {
    type: String,
    required: true
  },
  LastFetchedTimeForFarmerMember: {
    type: String,
    required: true
  },
  LastFetchedTimeForFarmerProduce: {
    type: String,
    required: true
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

const Product = mongoose.model('Product', productSchema)

module.exports = Product
export {}
