import mongoose from 'mongoose'

const Schema = mongoose.Schema

const FarmerMemberSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  id: {
    type: Number,
    required: true
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
  yearOfFirstPlanting: {
    type: Number
  },
  otherFarmEnterprises: {
    type: [String]
  },
  agroforestry: {
    type: String,
    default: 'No'
  },
  noOfFarmPlots: {
    type: Number
  },
  farmLocation: {
    type: Object
  },
  photoOfFarm: {
    type: String
  },
  enumerator: {
    type: String
  },
  enumeratorComment: {
    type: String
  },
  dateOfSurvey: {
    type: Date || String
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
    type: Schema.Types.Mixed,
    required: true
  },
  centroid: {
    type: Schema.Types.Mixed
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
  isLocationVerified: {
    type: Boolean,
    default: false
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

// Creating a 2D geospatial index on the location field. update: below code needs update becuase the geomatory of location object is changed, so we will need to index on location.features
// FarmerMemberSchema.index({ location: '2dsphere' })

// Creating a unique index on the instanceID field
FarmerMemberSchema.index({ instanceID: 1 }, { unique: true })

const FarmerMember = mongoose.model('farmermembers', FarmerMemberSchema)

module.exports = FarmerMember
export {}
