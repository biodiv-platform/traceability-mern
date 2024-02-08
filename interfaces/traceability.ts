import { type Types } from 'mongoose'

export interface Location {
  type: string
  coordinates: number[]
}

export interface FarmerMember {
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
  agroforestry?: 'YES' | 'NO'
  farmLocation?: any
  photoOfFarm?: string
  ccCode: number
  coCode: number
  unionCode: number
  instanceID: string
  instanceName?: string
  entity?: any
  submittedOnODK: Date
  submitterName: string
  formVersion: string
  reviewState?: string
  edits: string
  location: Location
  farmerProduceIds?: any[]
  isFarmerDataValidated: boolean
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
}

export interface FarmerProduceInfo {
  product: Types.ObjectId | string
  farmerProduceId: string
  farmerId?: string
  farmerName: string
  contactNo?: string
  produceType: string
  quantity: number
  noOfBags?: number
  deduction?: number
  deductionReason?: string
  netCollection?: number
  pricePerKg?: number
  amountPaidCalculate?: number
  millingCharge?: number
  dateOfCollection?: Date
  collectorName?: string
  collectorSubstr?: string
  calculateGrn?: string
  location?: object // You might want to define a more specific type for this object
  grnReceipt?: string
  farmerEID: string
  instanceID?: string
  instanceName?: string
  submittedOnODK?: Date
  submitterName?: string
  formVersion?: string
  reviewState?: string
  edits?: number
  batchId?: string
  batchIdMongo?: string
  ccCode?: number
  coCode?: number
  unionCode?: number
  createdAt: Date
  lastUpdatedAt: Date
  needsReview: boolean
  isDeleted: boolean
}
