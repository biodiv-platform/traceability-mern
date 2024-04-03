const mongoose = require('mongoose')

const Schema = mongoose.Schema

const locationSchema = new Schema(
  {
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
      type: Array,
      required: true
    }
  },
  { _id: false }
)

const FarmerMemberSchema = new Schema({
  // _id: String,
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
    type: String
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
    default: 'No'
  },
  farmLocation: {
    type: Object
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
    type: String
  },
  edits: {
    type: String,
    required: true
  },
  location: {
    type: locationSchema,
    required: true
  },
  flag: {
    type: Boolean,
    default: false,
    required: true
  },
  flagReason: {
    type: Array
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

// Creating a 2D geospatial index on the location field
FarmerMemberSchema.index({ location: '2dsphere' })

// Creating a index on the instanceID field
FarmerMemberSchema.index({ instanceID: 1 })

const FarmerMember = mongoose.model('farmermembers', FarmerMemberSchema)

module.exports = FarmerMember
export {}
