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

export interface IBatch {
  _id: string
  batchName: string
  quantity: number
  isReadyForLot: boolean
  batchStatus: string
  modalFieldCombined: Array<{
    lastUpdatedAt: string
    columnStatus: 'ADD' | 'EDIT' | 'DONE' | 'NOTAPPLICABLE'
    modalFieldId: any
    columnName: string
    isOptional: boolean
    fields: [name: string, value: any]
  }>
  ccCode: number[]
  coCode: number[]
  unionCode: number
  note: string | null
  type: string
  batchId: string
  farmerProduceIds: string[]
  flag: boolean
  flagReason: string[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  lotId?: string
  lotStatus?: string
  lotIdMongo?: string
}

export interface ILot {
  _id: string
  productId: string
  lotName: string
  type: string
  coCode: number[]
  ccCode: number[]
  unionCode: number
  quantity: number
  lotStatus: string
  modalFieldCombined: Array<{
    lastUpdatedAt: string
    columnStatus: 'ADD' | 'EDIT' | 'DONE' | 'NOTAPPLICABLE'
    modalFieldId: any
    columnName: string
    isOptional: boolean
    fields: [name: string, value: any]
  }>
  lotId: string
  batchIds: string[]
  farmerProduceIds: string[]
  flag: boolean
  flagReason: string[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  note: string | null
}
