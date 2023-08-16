const mongoose = require('mongoose')

const produceHierarchySchema = new mongoose.Schema({
  collectionCenter: {
    type: String,
    required: true,
  },
  cooperative: {
    type: String,
    required: true,
  },
  union: {
    type: String,
    required: true,
  },
})

const ProduceHierarchy = mongoose.model(
  'ProduceHierarchy',
  produceHierarchySchema
)

module.exports = ProduceHierarchy
export {}
