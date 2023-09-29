import { FarmerProduce } from '../models'
const mongoose = require('mongoose')

const getFarmerProduceDetailsById = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await FarmerProduce.findById(farmerId)
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const postFarmerProduceDetail = async (farmerInfo: any): Promise<any> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('farmerproduceinfos').countDocuments()
    const farmerProduceId = (Number(count) + 1).toString().padStart(3, '0')
    const newFarmer = new FarmerProduce({
      ...farmerInfo,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      collectionDate: new Date(),
      farmerProduceId
    })
    await newFarmer.save()
    return newFarmer
  } catch (err) {
    throw new Error(`Error while saving farmer details. Error:  ${err.message}`)
  }
}

const updateBatchIdInFarmerProduceDetails = async (
  farmerProduceIdMongo: string,
  batchId: string,
  batchIdMongo: string
): Promise<any> => {
  try {
    // code to update document in mongodb
    const updatedFarmer = await FarmerProduce.findByIdAndUpdate(
      farmerProduceIdMongo,
      {
        batchId,
        batchIdMongo
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedFarmer) {
      throw new Error('Document not found')
    }
    return updatedFarmer
  } catch (err) {
    throw new Error('Error while updating farmer details')
  }
}

// below code is used in development env to delete the farmer data from db
// eslint-disable-next-line
const deleteAllFarmers = async (): Promise<any> => {
  try {
    const deletedFarmer = await FarmerProduce.deleteMany({})
    return deletedFarmer
  } catch (err) {
    throw new Error('Error while deleting farmer details')
  }
}

export {
  getFarmerProduceDetailsById,
  postFarmerProduceDetail,
  updateBatchIdInFarmerProduceDetails
}
