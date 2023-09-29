import { Product } from '../models'

const productId = '651116a22895fa61aa049403' // FIXME: hardcoded

const retrieveFarmerMembersLastFetchedTime = async (): Promise<any> => {
  const product = await Product.findById(productId)

  return product.LastFetchedTimeForFarmerMember
}

const updateFarmerMembersLastFetchedTime = async (
  lastFetchedTime: string
): Promise<any> => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { lastFetchedTime },
    { new: true }
  )
  return product
}

const getLastFetchedTime = async (): Promise<string> => {
  const product = await Product.findById(
    productId,
    'LastFetchedTimeForFarmerProduce'
  )
  return product.lastFetchedTime
}

const saveLastFetchedTime = async (lastFetchedTime: string): Promise<any> => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { lastFetchedTime },
    { new: true }
  )
  return product
}

export {
  retrieveFarmerMembersLastFetchedTime,
  updateFarmerMembersLastFetchedTime,
  getLastFetchedTime,
  saveLastFetchedTime
}
