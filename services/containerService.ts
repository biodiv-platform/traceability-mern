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
import { getLot } from './lotService'
import { getModalFields } from './modalFieldService'
import { CONTAINER_FIELD_UPDATE_RULES } from '../static/constants'

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
  // Generate container ID
  const count = await Container.countDocuments()
  const containerId = `C-${(Number(count) + 1).toString().padStart(3, '0')}`
  let isReadyToSold = false
  // Calculate total amount paid from all lots
  let totalAmountPaid: number | null = 0

  for (const lotId of lotIds) {
    const lot: ILot | null = await getLot(lotId)
    const amount = lot?.amountPaidCalculate

    // if any remaining lot exist, then to total amount should be null
    if (amount === null) {
      totalAmountPaid = null
      break
    }
    if (typeof amount === 'number' && !isNaN(amount)) {
      totalAmountPaid += amount
    }
  }

  const modalFieldsArr = await getModalFields(
    '645774053e1875e3bd793978',
    'CONTAINER'
  ) // TODO: replace with dynamic productId

  const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
    (a, b) => a.index - b.index
  )

  sortedModalFieldsArrByIndex.forEach((modalFieldsArr) => {
    const fieldRules = CONTAINER_FIELD_UPDATE_RULES[modalFieldsArr.columnName]
    if (fieldRules) {
      modalFieldsArr.fields.forEach((field) => {
        if (fieldRules[field.name]) {
          field.value = fieldRules[field.name](containerData)
        }
      })
    }
  })

  const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
    (obj, index, arr) => {
      if (index === 0 && obj.isOptional) {
        obj.columnStatus = 'ADD'
        const nextNonOptionalIndex = arr.findIndex(
          (item, i) => i > index && !item.isOptional
        )
        if (nextNonOptionalIndex !== -1) {
          arr[nextNonOptionalIndex].columnStatus = 'ADD'
        }
        return obj
      }

      if (index === 0) {
        obj.columnStatus = 'ADD'
        return obj
      }

      if (obj.columnStatus === 'ADD') {
        return obj
      }

      if (obj.isOptional) {
        obj.columnStatus = 'ADD'
        return obj
      }

      obj.columnStatus = 'NOTAPPLICABLE'
      return obj
    }
  )

  isReadyToSold =
    updatedModalFieldsArr.length === 0 ||
    updatedModalFieldsArr.every(
      (field) =>
        field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
    )

  const container: IContainer = await new Container({
    ...containerData,
    containerId,
    id: Number(count) + 1,
    amountPaidCalculate: totalAmountPaid,
    containerStatus: isReadyToSold ? 'container_sold' : 'at_co_operative',
    modalFieldCombined: updatedModalFieldsArr,
    lotIds,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  }).save()

  // Update container name with container ID
  await Container.findByIdAndUpdate(
    container._id,
    {
      containerName: `${container.containerName}_${container.containerId}`
    },
    { new: true, runValidators: true }
  ).exec()

  // Update lot statuses
  await Promise.all(
    lotIds.map((lotId) =>
      Lots.findByIdAndUpdate(lotId, {
        containerId: container._id,
        isReadyForContainer: true,
        lotStatus: 'container_created'
      })
    )
  )

  return {
    container,
    lots: lotIds
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
