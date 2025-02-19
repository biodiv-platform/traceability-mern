import {
  type IBatch,
  type ILot,
  type IContainer,
  type IFarmerProduceInfo,
  IFarmerMember
} from 'interfaces/traceability'
import { Batches, Container, FarmerProduce, Lots } from '../models'
import mongoose from 'mongoose'
import { getFarmerDetailsBySubmissionUUID } from './farmerService'

const getContainer = async (containerId: string): Promise<IContainer> => {
  try {
    const container = await Container.findOne({ _id: containerId }).exec()

    if (!container) {
      throw new Error('Container not found')
    }

    return container as IContainer
  } catch (err) {
    throw new Error(`Error while fetching container. Error: ${err.message}`)
  }
}

const getLots = async (lotIds: string[]): Promise<ILot[]> => {
  try {
    const lots = await Lots.find({ _id: { $in: lotIds } }).exec()

    return lots as ILot[]
  } catch (err) {
    throw new Error(`Error while fetching lots. Error: ${err.message}`)
  }
}

const getBatches = async (batchIds: string[]): Promise<IBatch[]> => {
  try {
    const batches = await Batches.find({ _id: { $in: batchIds } }).exec()

    return batches as IBatch[]
  } catch (err) {
    throw new Error(`Error while fetching batches. Error: ${err.message}`)
  }
}

const getFarmerProduce = async (
  farmerProduceIds: string[]
): Promise<IFarmerProduceInfo[]> => {
  try {
    const farmerProduce = await FarmerProduce.find({
      _id: { $in: farmerProduceIds }
    }).exec()

    return farmerProduce as IFarmerProduceInfo[]
  } catch (err) {
    throw new Error(
      `Error while fetching farmer produce. Error: ${err.message}`
    )
  }
}

const getAllFarmerLocations = async (
  farmerProduce: IFarmerProduceInfo[]
): Promise<{
  farmerArr: IFarmerMember[]
  farmerLocationArr: any[]
}> => {
  const farmerMap = new Map()
  const farmerArr: any[] = []
  const farmerLocationArr: any[] = []

  try {
    // Use for...of instead of forEach to handle async operations properly
    for (const fp of farmerProduce) {
      const farmerEID = fp?.farmerEID

      const farmer = await getFarmerDetailsBySubmissionUUID(farmerEID)
      if (!farmer) {
        throw new Error(`Invalid farmer id found: ${farmerEID}`)
      }

      // Only add if not already in the map
      const farmerId = farmer._id.toString()
      if (!farmerMap.has(farmerId)) {
        farmerMap.set(farmerId, farmer)
        farmerArr.push(farmer)

        // Add to farmerLocationArr only if the farmer is unique
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
            noOfFarms: farmer.noOfFarmPlots
          }
        })
      }
    }

    return {
      farmerArr,
      farmerLocationArr
    }
  } catch (error) {
    throw new Error(`Error processing farmer locations: ${error.message}`)
  }
}

const saveContainer = async (container: IContainer): Promise<IContainer> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('containerinfos').countDocuments()
    const containerId = `C-${(Number(count) + 1).toString().padStart(3, '0')}`

    const timestamp = new Date().toISOString()

    const result = await new Container({
      product: '645774053e1875e3bd793978', // TODO: make this dynamic product id
      containerId,
      id: Number(count) + 1,
      createdAt: container.createdAt || timestamp,
      ...container
    }).save()

    // update containername with containerID
    const renamedContainer = `${result.containerName}_${result.containerId}`
    const updatedContainerName = await Container.findByIdAndUpdate(
      result._id,
      {
        containerName: renamedContainer
      },
      {
        new: true,
        runValidators: true
      }
    ).exec()

    return updatedContainerName as IContainer
  } catch (err) {
    throw new Error(`Error while saving container. Error: ${err.message}`)
  }
}

const updateLotBatchAndFarmerProduceIdsInContainer = async (
  containerId: string,
  lotIds: string[],
  batchIds: string[],
  farmerProduceIds: string[]
): Promise<IContainer> => {
  try {
    const container = await Container.findOneAndUpdate(
      { _id: containerId },
      {
        $addToSet: {
          lotIds: { $each: lotIds },
          batchIds: { $each: batchIds },
          farmerProduceIds: { $each: farmerProduceIds }
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).exec()

    return container as IContainer
  } catch (err) {
    throw new Error(
      `Error while updating lot, batch and farmer produce ids in container. Error: ${err.message}`
    )
  }
}

const updateContainerIdInLots = async (
  lotIds: string[],
  containerId: string,
  isReadyForContainer: boolean,
  lotStatus: 'Container created'
): Promise<any> => {
  try {
    const promises = lotIds.map(async (lotId: string) => {
      const lot = await Lots.findOneAndUpdate(
        { _id: lotId },
        {
          containerId,
          isReadyForContainer,
          lotStatus
        },
        { new: true, runValidators: true }
      ).exec()

      if (!lot) {
        throw new Error('Error while updating container id in lots')
      }
    })

    await Promise.all(promises)
  } catch (err) {
    throw new Error(
      `Error while updating container id in lots. Error: ${err.message}`
    )
  }
}

export {
  saveContainer,
  updateLotBatchAndFarmerProduceIdsInContainer,
  updateContainerIdInLots,
  getContainer,
  getLots,
  getBatches,
  getFarmerProduce,
  getAllFarmerLocations
}
