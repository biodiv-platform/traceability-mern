import {
  getFarmerDetailsBySubmissionUUID,
  getFarmerProduceDetailsById
} from '../services'
import { Batches } from '../models'
import { type IBatch } from '../interfaces/traceability'
import mongoose from 'mongoose'

const getBatch = async (batchId: string): Promise<any> => {
  try {
    const batch = await Batches.findById(batchId)
    return batch
  } catch (err) {
    throw new Error('Error while fetching batch')
  }
}

const getBatchesByBatchIds = async (BatchIds: string[]): Promise<any> => {
  try {
    const batches = await Batches.find({
      _id: { $in: BatchIds }
    })
    return batches
  } catch (err) {
    throw new Error('Error while fetching batch')
  }
}

const getFarmerProduceDetailsByBatchId = async (
  batchId: string
): Promise<any> => {
  try {
    const batch = await Batches.findOne(
      { _id: batchId },
      { farmerProduceIds: 1 }
    )

    if (!batch?.farmerProduceIds) {
      return []
    }

    const farmerProduceIdsArr = batch.farmerProduceIds

    const farmerProducePromises = farmerProduceIdsArr.map(
      async (farmerProduceId) =>
        await getFarmerProduceDetailsById(farmerProduceId)
    )

    const farmerProduceArr = await Promise.all(farmerProducePromises)

    return farmerProduceArr
  } catch (err) {
    throw new Error('Error while fetching farmer produce details')
  }
}

const getBatchFarmersAndProduce = async (batch): Promise<any> => {
  const farmerArr = []
  const farmerLocationArr = []
  const farmerProduceArr = []

  for (const farmerProduceId of batch.farmerProduceIds) {
    const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId)
    if (!farmerProduce) {
      throw new Error('Invalid farmer produce id found')
    }

    const farmer = await getFarmerDetailsBySubmissionUUID(
      farmerProduce.farmerEID
    )
    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }

    farmerArr.push(farmer)

    farmerLocationArr.push({
      type: 'Feature',
      geometry: {
        type: farmer.centroid.type,
        coordinates: farmer.centroid.coordinates
      },
      properties: {
        name: farmer.farmerName,
        _id: farmer._id,
        farmerId: farmer.farmerId,
        cc: farmer.cc,
        batchId: batch.batchId,
        noOfFarms: farmer.noOfFarmPlots
      }
    })

    farmerProduceArr.push({
      ...farmerProduce.toObject(),
      cc: farmer?.cc
    })
  }

  return { farmerArr, farmerLocationArr, farmerProduceArr }
}

const saveBatch = async (batch: IBatch): Promise<any> => {
  try {
    const db = mongoose.connection
    const count = await db.collection('batchinfos').countDocuments()
    const batchId = (Number(count) + 1).toString().padStart(3, '0')

    const newBatch = new Batches({
      ...batch,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      createdAt: new Date().toISOString(), // TODO:should we keep dateTime which is coming from frontend?
      lastUpdatedAt: new Date().toISOString(),
      batchId,
      id: Number(count) + 1
    })

    const savedBatch = await newBatch.save()
    return savedBatch
  } catch (err) {
    throw new Error(`Error while saving batch. Error:  ${err?.message}`)
  }
}

const updateBatchLotId = async (
  batchId: string,
  lotId: string,
  lotIdMongo: string,
  lotStatus: string
): Promise<any> => {
  try {
    // code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(
      batchId,
      {
        lotId,
        lotStatus,
        lotIdMongo
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedBatch) {
      throw new Error('Document not found')
    }
    return updatedBatch
  } catch (err) {
    throw new Error('Error while updating batch')
  }
}

const updateBatchColumnFields = async (Batch: IBatch): Promise<any> => {
  try {
    // code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(
      Batch._id,
      {
        batchStatus: Batch.batchStatus,
        isReadyForLot: Batch.isReadyForLot,
        modalFieldCombined: Batch.modalFieldCombined
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedBatch) {
      throw new Error('Document not found')
    }

    return updatedBatch
  } catch (err) {
    throw new Error('Error while updating batch')
  }
}

const deleteAllBatches = async (): Promise<any> => {
  try {
    const deletedBatches = await Batches.deleteMany({})
    return deletedBatches
  } catch (err) {
    throw new Error('Error while deleting batches')
  }
}

export {
  getBatch,
  getBatchesByBatchIds,
  getFarmerProduceDetailsByBatchId,
  getBatchFarmersAndProduce,
  saveBatch,
  updateBatchLotId,
  updateBatchColumnFields,
  deleteAllBatches
}
