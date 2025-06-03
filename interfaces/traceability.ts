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
