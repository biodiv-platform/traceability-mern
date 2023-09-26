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
    type: Date,
    required: true
  }
})

const Product = mongoose.model('Product', productSchema)

module.exports = Product
export {}
