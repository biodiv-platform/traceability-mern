import { type Types } from 'mongoose'

export interface Location {
  type: string
  coordinates: number[]
}

export interface IFarmerMember {
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

export interface IFarmerProduceInfo {
  id: number
  _id?: string
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
  location?: any
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
  produceStatus: string
  ccCode?: number
  coCode?: number
  unionCode?: number
  flag: boolean
  flagReason?: any[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
}

export interface IBatch {
  _id: string
  batchName: string
  quantity: number
  isReadyForLot: boolean
  batchStatus: 'Lot created' | 'Pending' | 'Ready for lot'
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
  isReadyForContainer: boolean
  id: any
  _id: string
  productId: string
  lotName: string
  type: string
  coCode: number[]
  ccCode: number[]
  unionCode: number
  quantity: number
  lotStatus: 'Container created' | 'Pending' | 'Ready for container'
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

export interface IContainer {
  id: any
  _id: string
  productId: string
  containerName: string
  type: string
  coCode: number[]
  ccCode: number[]
  unionCode: number
  quantity: number
  containerStatus: string
  modalFieldCombined: Array<{
    lastUpdatedAt: string
    columnStatus: 'ADD' | 'EDIT' | 'DONE' | 'NOTAPPLICABLE'
    modalFieldId: any
    columnName: string
    isOptional: boolean
    fields: [name: string, value: any]
  }>
  containerId: string
  lotIds: string[]
  batchIds: string[]
  farmerProduceIds: string[]
  flag: boolean
  flagReason: string[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  note: string | null
}
