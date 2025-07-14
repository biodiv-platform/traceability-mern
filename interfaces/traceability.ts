import { type Types } from 'mongoose'

export interface Location {
  type: string
  coordinates: number[]
}

export type CoffeeType =
  | 'wugar'
  | 'kibiko'
  | 'faq'
  | 'faq_sc18'
  | 'faq_sc15'
  | 'faq_sc12'
  | 'faq_bhp'
  | 'faq_ug'

export const CoffeeTypesArray: CoffeeType[] = [
  'wugar',
  'kibiko',
  'faq',
  'faq_sc18',
  'faq_sc15',
  'faq_sc12',
  'faq_bhp',
  'faq_ug'
]

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

export type CreateFarmerInput = Omit<
  IFarmerMember,
  'id' | '_id' | 'product' | 'farmerId' | 'lastUpdatedAt' | 'isDeleted'
>

export interface IFarmerProduceInfo {
  id: number
  _id?: string
  product: Types.ObjectId | string
  farmerProduceId: string
  farmerId?: string
  farmerName: string
  contactNo?: string
  produceType: CoffeeType
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
  produceStatus: 'batch_created' | 'ready_for_batch'
  ccCode: number
  coCode: number
  unionCode: number
  flag: boolean
  flagReason?: any[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
}

export interface IBatch {
  _id: string
  id: number
  batchName: string
  quantity: number
  isReadyForLot: boolean
  batchStatus: 'lot_created' | 'pending' | 'ready_for_lot'
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
  type: CoffeeType
  batchId: string
  farmerProduceIds: string[]
  flag: boolean
  flagReason: string[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  lotId?: string
  lotStatus?: 'container_created' | 'pending' | 'ready_for_container'
  lotIdMongo?: string
}

export interface ILot {
  isReadyForContainer: boolean
  isSubLotCreated: boolean
  id: any
  _id: string
  productId: string
  lotName: string
  type: CoffeeType
  coCode: number[]
  ccCode: number[]
  unionCode: number
  quantity: number
  lotStatus:
    | 'container_created'
    | 'pending'
    | 'ready_for_container'
    | 'sub_lot_created'
  lotCategory?: 'lot' | 'sub_lot' | 'remaining_lot'

  modalFieldCombined: Array<{
    lastUpdatedAt: string
    columnStatus: 'ADD' | 'EDIT' | 'DONE' | 'NOTAPPLICABLE'
    modalFieldId: any
    columnName: string
    isOptional: boolean
    fields: [name: string, value: any]
  }>
  lotId?: string
  batchIds: string[]
  farmerProduceIds: string[]
  flag: boolean
  flagReason: string[]
  createdAt: Date
  lastUpdatedAt: Date
  isDeleted: boolean
  note: string | null
}

export interface ISubLot extends ILot {}

export interface IContainer {
  id: any
  _id: string
  productId: string
  containerName: string
  type: CoffeeType
  coCode: number[]
  ccCode: number[]
  unionCode: number
  quantity: number
  containerStatus: 'container_sold' | 'pending'
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
  isReadyToSold: boolean
  maxWeight: number
}

export interface FieldType {
  fieldType: string
  inputType?: string
  value: any
  width: string
  label: string
  name: string
  yupSchema?: string
  disabled?: boolean
  required?: boolean
  showPercent?: boolean
  percentBaseField?: string
}

export interface ModalField {
  modalFieldId: string
  columnName: string
  fields: FieldType[]
  columnStatus: string
  [key: string]: any
}
