import { Farmers } from '../models'
const mongoose = require('mongoose')

const getFarmerDetailsById = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await Farmers.findById(farmerId)
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getFarmersDetailAfterTimestamp = async (
  timestamp: Date
): Promise<any> => {
  const farmers = await Farmers.find({
    collectionDate: { $gte: timestamp }
  })
  return farmers
}

const postFarmersDetail = async (farmerInfo: any): Promise<any> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('farmerscollections').countDocuments()
    const farmerId = `MIT-${(Number(count) + 1).toString().padStart(3, '0')}`
    const newFarmer = new Farmers({
      ...farmerInfo,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      collectionDate: new Date(),
      farmerId,
      farmerProduceIds: []
    })
    await newFarmer.save()
    return newFarmer
  } catch (err) {
    throw new Error(`Error while saving farmer details. Error:  ${err.message}`)
  }
}

const updateBatchIdInFarmerDetails = async (
  farmerId: string,
  batchId: string
): Promise<any> => {
  try {
    // code to update document in mongodb
    const updatedFarmer = await Farmers.findByIdAndUpdate(
      farmerId,
      {
        batchId
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

const updateFarmerCollection = async (
  farmerId,
  farmerProduceId
): Promise<any> => {
  try {
    const updatedFarmer = await Farmers.findOneAndUpdate(
      { farmerId },
      {
        $push: { farmerProduceIds: farmerProduceId }
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedFarmer) {
      throw new Error('Document not found')
    }
    return updatedFarmer
  } catch (err) {
    throw new Error(
      `Error while updating farmer details. Error: ${err.message}`
    )
  }
}

// below code is used in development env to delete the farmer data from db
// eslint-disable-next-line
const deleteAllFarmers = async (): Promise<any> => {
  try {
    const deletedLots = await Farmers.deleteMany({})
    return deletedLots
  } catch (err) {
    throw new Error('Error while deleting lots')
  }
}

// deleteAllFarmers()

export {
  getFarmerDetailsById,
  getFarmersDetailAfterTimestamp,
  postFarmersDetail,
  updateBatchIdInFarmerDetails,
  updateFarmerCollection
}
