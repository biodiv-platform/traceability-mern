import mongoose, { type Types, type Document } from 'mongoose'

export interface FarmerDocument extends Document {
  id: number
  _id?: string
  product: Types.ObjectId | string
  farmerId: string
  farmerName: string
  gender: string
  dateOfBirth: Date
  formatDate?: string
  contactNumber?: string
  nationalIdentityNumber?: string
  levelOfEducation?: string
  noOfDependents?: number
  village: string
  cc: string
  landAcreage: number
  coffeeAcreage: number
  noOfCoffeeTrees: number
  otherFarmEnterprises?: string[]
  agroforestry?: 'Yes' | 'No'
  farmLocation?: object
  photoOfFarm?: string
  ccCode: number
  coCode: number
  unionCode: number
  instanceID: string
  instanceName?: string
  entity?: {
    label: string
  }
  submittedOnODK: Date
  submitterName: string
  formVersion: string
  reviewState?: string | null
  edits: string
  location: GeoJSON.FeatureCollection
  farmerProduceIds?: any[]
  isFarmerDataValidated: boolean
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  flag?: boolean
  flagReason?: string[]
  isLocationVerified?: boolean
  dateOfSurvey?: Date | null
  enumerator?: string
  enumeratorComment?: string | null
  noOfFarmPlots: number
  yearOfFirstPlanting: number | null
  centroid: GeoJSON.Point | GeoJSON.MultiPoint
}

const FarmerMemberSchema = new mongoose.Schema({
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
    enum: ['Male', 'Female', 'Other'],
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
    enum: ['Yes', 'No'],
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
    type: Date
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
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  centroid: {
    type: mongoose.Schema.Types.Mixed,
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
  }
})

// Creating a unique index on the instanceID field
FarmerMemberSchema.index({ instanceID: 1 }, { unique: true })

const FarmerMember = mongoose.model<FarmerDocument>(
  'farmermembers',
  FarmerMemberSchema
)
module.exports = FarmerMember
export {}
