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
  farmerName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  formatDate: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String
  },
  nationalIdentityNumber: {
    type: String
  },
  levelOfEducation: {
    type: String
  },
  noOfDependents: {
    type: Number
  },
  village: {
    type: String,
    required: true
  },
  cc: {
    type: String,
    required: true
  },
  landAcreage: {
    type: Number,
    required: true
  },
  coffeeAcreage: {
    type: Number,
    required: true
  },
  noOfCoffeeTrees: {
    type: Number,
    required: true
  },
  otherFarmEnterprises: {
    type: [String]
  },
  agroforestry: {
    type: String,
    default: 'No',
    required: true
  },
  farmLocation: {
    type: String
  },
  photoOfFarm: {
    type: String
  },
  ccCode: {
    type: Number,
    required: true
  },
  coCode: {
    type: Number,
    required: true
  },
  unionCode: {
    type: Number,
    required: true
  },
  instanceID: {
    type: String,
    required: true
  },
  instanceName: {
    type: String
  },
  entity: {
    type: Object
  },
  submittedOnODK: {
    type: Date,
    required: true
  },
  submitterName: {
    type: String,
    required: true
  },
  formVersion: {
    type: String,
    required: true
  },
  reviewState: {
    type: String,
    required: true
  },
  edits: {
    type: String,
    required: true
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
  farmerProduceIds: {
    type: Array
  },
  isFarmerDataValidated: {
    type: Boolean,
    default: false,
    required: true
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
