import {
  FARMER_MEMBER_ODK_FORM_DETAILS,
  FARMER_PRODUCE_ODK_FORM_DETAILS
} from '../static/constants'
import { Product } from '../models'

const retrieveFarmerMembersLastFetchedTime = async (formName): Promise<any> => {
  let product = await Product.findOne({
    productName: 'Robusta Coffee'
  })

  product = product.toObject()

  const queryKey =
    FARMER_MEMBER_ODK_FORM_DETAILS[formName].LAST_SYNCED_TIME_KEY_FM

  return product[queryKey]
}

const updateFarmerMembersLastFetchedTime = async (
  LastFetchedTimeForFarmerMember: string,
  formName: string
): Promise<any> => {
  const lastSyncedKeyName =
    FARMER_MEMBER_ODK_FORM_DETAILS[formName].LAST_SYNCED_TIME_KEY_FM
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { [lastSyncedKeyName]: LastFetchedTimeForFarmerMember },
    { new: true }
  )
  return product
}

const retrieveFarmerProduceLastFetchedTime = async (formName): Promise<any> => {
  const product = await Product.findOne({
    productName: 'Robusta Coffee'
  })

  return product.FARMER_PRODUCE_ODK_FORM_DETAILS[formName]
    .LAST_SYNCED_TIME_KEY_FP
}

const updateFarmerProduceLastFetchedTime = async (
  LastFetchedTimeForFarmerProduce: string,
  formName: string
): Promise<any> => {
  const lastSyncedKeyName =
    FARMER_PRODUCE_ODK_FORM_DETAILS[formName].LAST_SYNCED_TIME_KEY_FP
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { [lastSyncedKeyName]: LastFetchedTimeForFarmerProduce },
    { new: true }
  )
  return product
}

const saveLastFetchedFarmerMember = async (FarmerId: string): Promise<any> => {
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { LastFetchedFarmerMember: FarmerId },
    { new: true }
  )
  return product
}

const saveLastFetchedFarmerProduce = async (
  FarmerProduceId: string
): Promise<any> => {
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { LastFetchedFarmerProduce: FarmerProduceId },
    { new: true }
  )
  return product
}

export {
  retrieveFarmerMembersLastFetchedTime,
  updateFarmerMembersLastFetchedTime,
  retrieveFarmerProduceLastFetchedTime,
  updateFarmerProduceLastFetchedTime,
  saveLastFetchedFarmerMember,
  saveLastFetchedFarmerProduce
}
