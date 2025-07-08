import mongoose from 'mongoose'
import {
  type IContainer,
  type ILot,
  type IBatch,
  type IFarmerProduceInfo,
  type IFarmerMember
} from '../interfaces/traceability'
import { Container, Lots, Batches, FarmerProduce } from '../models'
import { getFarmerDetailsBySubmissionUUID } from './farmerService'
import logger from '../utils/logger'

/**
 * Get detailed container information including associated entities
 */
const getContainerDetails = async (
  containerId: string
): Promise<{
  container: IContainer
  lotArr: ILot[]
  batches: IBatch[]
  farmerProduceArr: IFarmerProduceInfo[]
  farmerArr: IFarmerMember[]
  farmerLocationArr: any[]
}> => {
  try {
    const container = await Container.findOne({ _id: containerId }).exec()
    if (!container) {
      throw new Error('Container not found')
    }

    const lots = await Lots.find({ _id: { $in: container.lotIds } }).exec()
    const batches = await Batches.find({
      _id: { $in: container.batchIds }
    }).exec()
    const farmerProduceArr = await FarmerProduce.find({
      _id: { $in: container.farmerProduceIds }
    }).exec()

    // Get farmer locations
    const { farmerArr, farmerLocationArr } = await getAllFarmerLocations(
      farmerProduceArr
    )

    return {
      container: container as IContainer,
      lotArr: lots as ILot[],
      batches: batches as IBatch[],
      farmerProduceArr: farmerProduceArr as IFarmerProduceInfo[],
      farmerArr,
      farmerLocationArr
    }
  } catch (error) {
    logger.error('Error in getContainerDetails:', error)
    throw new Error(`Failed to fetch container details: ${error.message}`)
  }
}

/**
 * Save a new container and update related entities
 */
const saveNewContainer = async (
  containerData: Partial<IContainer>,
  lotIds: string[]
): Promise<{
  container: IContainer
  lots: string[]
}> => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // Generate container ID
    const count = await Container.countDocuments()
    const containerId = `C-${(Number(count) + 1).toString().padStart(3, '0')}`

    const container = await new Container({
      ...containerData,
      containerId,
      id: Number(count) + 1,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    }).save({ session })

    // Update container name with container ID
    const updatedContainer = await Container.findByIdAndUpdate(
      container._id,
      {
        containerName: `${container.containerName}_${container.containerId}`,
        lotIds
      },
      { new: true, runValidators: true, session }
    ).exec()

    // Update lot statuses
    await Promise.all(
      lotIds.map((lotId) =>
        Lots.findByIdAndUpdate(
          lotId,
          {
            containerId: container._id,
            isReadyForContainer: true,
            lotStatus: 'container_created'
          },
          { session }
        )
      )
    )

    await session.commitTransaction()
    return {
      container: updatedContainer as IContainer,
      lots: lotIds
    }
  } catch (error) {
    await session.abortTransaction()
    logger.error('Error in saveNewContainer:', error)
    throw new Error(`Failed to save container: ${error.message}`)
  } finally {
    await session.endSession()
  }
}

/**
 * Update container information
 */
const updateContainer = async (
  containerId: string,
  containerData: Partial<IContainer>
): Promise<IContainer> => {
  try {
    const container = await Container.findByIdAndUpdate(
      containerId,
      {
        ...containerData,
        lastUpdatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).exec()

    if (!container) {
      throw new Error('Container not found')
    }

    return container as IContainer
  } catch (error) {
    logger.error('Error in updateContainer:', error)
    throw new Error(`Failed to update container: ${error.message}`)
  }
}

/**
 * Get lots associated with specified containers
 */
const getAssociatedLots = async (containerIds: string[]): Promise<ILot[]> => {
  try {
    const containers = await Container.find({
      _id: { $in: containerIds }
    }).select('lotIds')

    const lotIds = containers.reduce((acc: string[], container) => {
      return acc.concat(container.lotIds || [])
    }, [])

    const lots = await Lots.find({ _id: { $in: lotIds } }).exec()
    return lots as ILot[]
  } catch (error) {
    logger.error('Error in getAssociatedLots:', error)
    throw new Error(`Failed to fetch associated lots: ${error.message}`)
  }
}

// Helper function for getting farmer locations
const getAllFarmerLocations = async (
  farmerProduce: IFarmerProduceInfo[]
): Promise<{
  farmerArr: IFarmerMember[]
  farmerLocationArr: any[]
}> => {
  const farmerMap = new Map()
  const farmerArr: IFarmerMember[] = []
  const farmerLocationArr: any[] = []

  try {
    for (const fp of farmerProduce) {
      const farmerEID = fp?.farmerEID
      const farmer = await getFarmerDetailsBySubmissionUUID(farmerEID)

      if (!farmer) {
        logger.warn(`Invalid farmer ID found: ${farmerEID}`)
        continue
      }

      const farmerId = farmer._id.toString()
      if (!farmerMap.has(farmerId)) {
        farmerMap.set(farmerId, farmer)
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
    logger.error('Error in getAllFarmerLocations:', error)
    throw new Error(`Failed to process farmer locations: ${error.message}`)
  }
}
export {
  getContainerDetails,
  saveNewContainer,
  updateContainer,
  getAssociatedLots,
  getAllFarmerLocations
}
