import { ODK_FORM_DETAILS } from '../static/constants'
import { Product } from '../models'

const retrieveFarmerMembersLastFetchedTime = async (formName): Promise<any> => {
  try {
    let product = await Product.findOne({
      productName: 'Robusta Coffee'
    })
    if (!product) return null
    product = product.toObject()
    const queryKey = ODK_FORM_DETAILS[formName]?.LAST_SYNCED_TIME_KEY_FM
    if (!queryKey) {
      throw new Error(`Invalid form name: ${formName}`)
    }
    const lastSyncedTime = product[queryKey]
    if (!lastSyncedTime) {
      throw new Error('No last sync time found')
    }

    return lastSyncedTime
  } catch (err) {
    throw new Error(`Error fetching last synced time. Err: ${err.message}`)
  }
}

const updateFarmerMembersLastFetchedTime = async (
  LastFetchedTimeForFarmerMember: string,
  formName: string
): Promise<any> => {
  try {
    const lastSyncedKeyName =
      ODK_FORM_DETAILS[formName]?.LAST_SYNCED_TIME_KEY_FM
    if (!lastSyncedKeyName) {
      throw new Error(
        `Invalid form name provided: ${formName}. Please check ODK_FORM_DETAILS.`
      )
    }
    // if you are not able to sync the updated time in mongo, check if <lastSyncedKeyName> exist in product schema.
    const product = await Product.findOneAndUpdate(
      { productName: 'Robusta Coffee' },
      { [lastSyncedKeyName]: LastFetchedTimeForFarmerMember },
      { new: true }
    )
    return product
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

const retrieveFarmerProduceLastFetchedTime = async (formName): Promise<any> => {
  try {
    const product = await Product.findOne({
      productName: 'Robusta Coffee'
    })

    if (!product) return null
    const queryKey = ODK_FORM_DETAILS[formName]?.LAST_SYNCED_TIME_KEY_FP
    if (!queryKey) {
      throw new Error(
        `Invalid form name provided: ${formName}. Please check ODK_FORM_DETAILS.`
      )
    }
    const lastSyncedTime = product[queryKey]
    if (!lastSyncedTime) {
      throw new Error('No last sync time found')
    }

    return lastSyncedTime
  } catch (err) {
    throw new Error(
      `Error retrieving farmer produce last fetched time. Err: ${err.message}`
    )
  }
}

const updateFarmerProduceLastFetchedTime = async (
  LastFetchedTimeForFarmerProduce: string,
  formName: string
): Promise<any> => {
  try {
    const lastSyncedKeyName =
      ODK_FORM_DETAILS[formName]?.LAST_SYNCED_TIME_KEY_FP
    if (!lastSyncedKeyName) {
      throw new Error(
        `Invalid form name provided: ${formName}. Please check ODK_FORM_DETAILS.`
      )
    }
    const product = await Product.findOneAndUpdate(
      {
        productName: 'Robusta Coffee'
      },
      { [lastSyncedKeyName]: LastFetchedTimeForFarmerProduce },
      { new: true }
    )
    return product
  } catch (error) {
    console.error(
      `Error updating farmer produce last fetched time. Err: ${error.message}`
    )
    throw error
  }
}

const saveLastFetchedFarmerMember = async (FarmerId: string): Promise<any> => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        productName: 'Robusta Coffee'
      },
      { LastFetchedFarmerMember: FarmerId },
      { new: true }
    )
    return product
  } catch (error) {
    console.error(
      `Error saving last fetched farmer member. Err: ${error.message}`
    )
    throw error
  }
}

const saveLastFetchedFarmerProduce = async (
  FarmerProduceId: string
): Promise<any> => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        productName: 'Robusta Coffee'
      },
      { LastFetchedFarmerProduce: FarmerProduceId },
      { new: true }
    )
    return product
  } catch (error) {
    console.error(
      `Error saving last fetched farmer produce. Err: ${error.message}`
    )
    throw error
  }
}

export {
  retrieveFarmerMembersLastFetchedTime,
  updateFarmerMembersLastFetchedTime,
  retrieveFarmerProduceLastFetchedTime,
  updateFarmerProduceLastFetchedTime,
  saveLastFetchedFarmerMember,
  saveLastFetchedFarmerProduce
}
