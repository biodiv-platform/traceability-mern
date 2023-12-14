const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FarmerMemberSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
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
  isFarmerDataValidated: {
    type: Boolean,
    require: true
  },
  farmerProduceIds: {
    type: Array
  },
  createdAt: {
    type: Date,
    required: true,
    default: new Date().toISOString()
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

// Creating a 2D geospatial index on the location2D field
FarmerMemberSchema.index({ location: '2dsphere' })

const FarmerMember = mongoose.model('farmermembers', FarmerMemberSchema)

module.exports = FarmerMember
export {}
