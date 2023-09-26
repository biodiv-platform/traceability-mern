import { Product } from '../models'

const productId = '651116a22895fa61aa049403' // FIXME: hardcoded

const getLastFetchedTime = async (): Promise<Date> => {
  const product = await Product.findById(productId, 'lastFetchedTime')
  return product.lastFetchedTime
}

const saveLastFetchedTime = async (lastFetchedTime: Date): Promise<any> => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { lastFetchedTime },
    { new: true }
  )
  return product
}

export { getLastFetchedTime, saveLastFetchedTime }
