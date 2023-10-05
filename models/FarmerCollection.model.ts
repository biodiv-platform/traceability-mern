const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FarmerCollectionSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  collectionDate: {
    type: Date,
    required: true,
    default: new Date()
  },
  farmerId: {
    type: String,
    required: true
  },
  personalDetails: {
    type: Object
  },
  farmDetails: {
    type: Object
  },
  ccCode: {
    type: Number
  },
  coCode: {
    type: Number
  },
  unionCode: {
    type: Number
  },
  metaData: {
    type: Object
  },
  location: {
    type: {
      type: String,
      enum: [
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiPolygon',
        'MultiLineString',
        'GeometryCollection'
      ],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  isFarmerDataValid: {
    type: Boolean,
    require: true
  },
  farmerProduceIds: {
    type: Array
  }
})

// Creating a 2D geospatial index on the location2D field
FarmerCollectionSchema.index({ location: '2dsphere' })

const FarmerCollection = mongoose.model(
  'farmerscollection',
  FarmerCollectionSchema
)

module.exports = FarmerCollection
export {}
