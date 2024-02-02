import { Product } from '../models'

const retrieveFarmerMembersLastFetchedTime = async (): Promise<any> => {
  const product = await Product.findOne({
    productName: 'Robusta Coffee'
  })

  return product.LastFetchedTimeForFarmerMember
}

const updateFarmerMembersLastFetchedTime = async (
  LastFetchedTimeForFarmerMember: string
): Promise<any> => {
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { LastFetchedTimeForFarmerMember },
    { new: true }
  )
  return product
}

const retrieveFarmerProduceLastFetchedTime = async (): Promise<any> => {
  const product = await Product.findOne({
    productName: 'Robusta Coffee'
  })

  return product.LastFetchedTimeForFarmerProduce
}

const updateFarmerProduceLastFetchedTime = async (
  LastFetchedTimeForFarmerProduce: string
): Promise<any> => {
  const product = await Product.findOneAndUpdate(
    {
      productName: 'Robusta Coffee'
    },
    { LastFetchedTimeForFarmerProduce },
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
