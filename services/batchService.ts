import { SITE_CONFIG, BATCH_FIELD_UPDATE_RULES } from '../static/constants'
import {
  getFarmerDetailsBySubmissionUUID,
  getFarmerProduceDetailsById,
  getlistData,
  getAggregations,
  getModalFields,
  updateBatchIdInFarmerProduceDetails
} from '../services'
import { Batches } from '../models'
import {
  type IBatch,
  type IFarmerProduceInfo,
  type IFarmerMember,
  type CoffeeType
} from '../interfaces/traceability'
import mongoose from 'mongoose'
import { BATCH_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { FIELD_TYPES } from '../utils/schema'

interface CreateBatchInput {
  farmerProduceIds: string[]
  type: CoffeeType
  unionCode: number
  batchName: string
  product?: string
  quantity: number
  ccCode: number[]
  coCode: number[]
  note?: string | null
}

interface CreateBatchResult {
  batch: IBatch
  farmerProduceIds: string[]
}

interface BatchDetailsResponse {
  batch: IBatch
  farmerProduceArr: IFarmerProduceInfo[]
  farmerArr: IFarmerMember[]
  farmerLocationArr: Array<{
    type: 'Feature'
    geometry: {
      type: string
      coordinates: number[]
    }
    properties: {
      name: string
      _id: string
      farmerId: string
      cc: string
      batchId: string
      noOfFarms: number
    }
  }>
}

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

/**
 * Get farmer produce details associated with a specific batch
 * @param batchId - The MongoDB ObjectId of the batch
 * @returns Array of farmer produce details with their associated information
 * @throws {Error} If batch ID is invalid or farmer produce details cannot be fetched
 */
const getFarmerProduceDetailsByBatchId = async (
  batchId: string
): Promise<IFarmerProduceInfo[]> => {
  try {
    if (!mongoose.isValidObjectId(batchId)) {
      throw new Error('Invalid batch ID format')
    }

    const batch = await Batches.findOne(
      { _id: batchId },
      { farmerProduceIds: 1, _id: 0 }
    ).lean()

    if (!batch?.farmerProduceIds?.length) {
      return []
    }

    const farmerProduceDetails = await Promise.all(
      batch.farmerProduceIds.map(async (farmerProduceId) => {
        try {
          return await getFarmerProduceDetailsById(farmerProduceId)
        } catch (error) {
          console.error(
            `Error fetching farmer produce ${farmerProduceId}:`,
            error
          )
          return null
        }
      })
    )

    return farmerProduceDetails.filter(Boolean)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to fetch farmer produce details: ${errorMessage}`)
  }
}

const getBatchFarmersAndProduce = async (batch): Promise<any> => {
  const farmerArr = []
  const farmerLocationArr = []
  const farmerProduceArr = []

  // Use a Map to track unique farmers by their ID
  const farmerMap = new Map()

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

    // Only add if not already in the map
    if (!farmerMap.has(farmer._id.toString())) {
      farmerMap.set(farmer._id.toString(), farmer)
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
          batchId: batch.batchId,
          noOfFarms: farmer.noOfFarmPlots
        }
      })
    }

    farmerProduceArr.push({
      ...farmerProduce.toObject(),
      cc: farmer?.cc
    })
  }

  return { farmerArr, farmerLocationArr, farmerProduceArr }
}

const saveBatch = async (batch: Partial<IBatch>): Promise<IBatch> => {
  try {
    const db = mongoose.connection
    const count = await db.collection('batchinfos').countDocuments()
    const batchId = `B-${(Number(count) + 1).toString().padStart(3, '0')}`

    const newBatch = new Batches({
      ...batch,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      batchId,
      batchName: `${batch.batchName}_${batchId}`,
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
  payload: {
    lotId: string
    lotIdMongo: string
    lotStatus: string
    batchStatus: 'lot_created'
  }
): Promise<any> => {
  try {
    // code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(batchId, payload, {
      new: true,
      runValidators: true
    }).exec()

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

/**
 * Creates a new batch with the given input data
 * @param input Batch creation input data
 * @param activityLogger Function to log batch creation activity
 * @returns Created batch and associated farmer produce IDs
 */
const createBatch = async (
  input: CreateBatchInput,
  activityLogger: (activity: any) => Promise<void>
): Promise<CreateBatchResult> => {
  try {
    const { farmerProduceIds, type: batchType, unionCode, ...batchData } = input

    if (!farmerProduceIds?.length) {
      throw new Error('Farmer produce IDs are required to create batch')
    }

    const modalFieldsArr = await getModalFields(
      SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      'BATCH'
    )

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => a.index - b.index
    )

    sortedModalFieldsArrByIndex.forEach((modalFieldsArr) => {
      const fieldRules = BATCH_FIELD_UPDATE_RULES[modalFieldsArr.columnName]
      if (fieldRules) {
        modalFieldsArr.fields.forEach((field) => {
          if (fieldRules[field.name]) {
            field.value = fieldRules[field.name](batchData)
          }
        })
      }
    })

    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (field, index) => {
        const isScopeNonEmpty = Object.keys(field?.scope || {}).length !== 0
        const isScopeCriteriaMet =
          isScopeNonEmpty && field.scope?.type.includes(batchType.toUpperCase())

        if (index === 0 || field.isOptional) {
          field.columnStatus = isScopeCriteriaMet ? 'ADD' : 'NOTAPPLICABLE'
        } else {
          field.columnStatus = isScopeNonEmpty
            ? isScopeCriteriaMet
              ? 'ADD'
              : 'NOTAPPLICABLE'
            : 'ADD'
        }

        return field
      }
    )

    const isReadyForLot =
      updatedModalFieldsArr.length === 0 ||
      updatedModalFieldsArr.every(
        (field) =>
          field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
      )

    const batchToSave = {
      ...batchData,
      unionCode,
      isDeleted: false,
      isReadyForLot,
      batchStatus: isReadyForLot ? 'ready_for_lot' : 'pending',
      type: batchType,
      modalFieldCombined: updatedModalFieldsArr,
      farmerProduceIds,
      flag: false,
      flagReason: []
    }

    const savedBatch = await saveBatch(batchToSave as Partial<IBatch>)

    for (const farmerProduceId of farmerProduceIds) {
      const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId)
      if (!farmerProduce) {
        throw new Error('Invalid farmer produce ID found')
      }

      await updateBatchIdInFarmerProduceDetails(
        farmerProduceId,
        savedBatch.batchId,
        savedBatch._id.toString(),
        'batch_created'
      )
    }

    const activity = {
      activityHolderId: savedBatch._id,
      activityHolderType: 'BATCH',
      activityType: 'BATCH_CREATION',
      rootHolderId: savedBatch._id,
      rootHolderType: 'content.eml.Batch',
      subRootHolderId: savedBatch._id,
      subRootHolderType: 'content.eml.Batch',
      activityDescription: `Batch: ${savedBatch.batchName} created`,
      isShowable: true
    }

    await activityLogger(activity)

    return {
      batch: savedBatch,
      farmerProduceIds
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to create batch: ${errorMessage}`)
  }
}

interface UpdateBatchInput {
  selectedModalFieldId: string
  fields: {
    finalizeBatch?: boolean
    [key: string]: any
  }
}

/**
 * Updates a batch's modal fields and status
 * @param batchId ID of the batch to update
 * @param input Update input containing modal field changes
 * @param activityLogger Function to log batch update activity
 * @returns Updated batch
 * @throws {Error} If batch not found or update fails
 */
const updateBatch = async (
  batchId: string,
  input: UpdateBatchInput,
  activityLogger: (activity: any) => Promise<void>
): Promise<IBatch> => {
  try {
    const batch = await getBatch(batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    const { selectedModalFieldId, fields } = input
    let isReadyForLot = false

    // Find the index of the modal field being updated
    const findModalFieldIndex = batch.modalFieldCombined.findIndex((obj) => {
      return obj.modalFieldId === selectedModalFieldId
    })

    if (findModalFieldIndex === -1) {
      throw new Error('Invalid modal field id found')
    }

    // Update modal fields array with new values
    const batchModalFieldsArr = batch.modalFieldCombined.map(
      (modalField: any, index: number) => {
        if (
          !modalField.isOptional &&
          findModalFieldIndex === batch.modalFieldCombined.length - 1 &&
          fields.finalizeBatch
        ) {
          isReadyForLot = true
        }

        if (index === findModalFieldIndex) {
          // Update column status and field values
          modalField.columnStatus = fields.finalizeBatch ? 'DONE' : 'EDIT'

          modalField.fields.forEach((field: any) => {
            if (Object.prototype.hasOwnProperty.call(fields, field?.name)) {
              field.value = fields[field.name]
            }
          })

          return modalField
        } else if (
          fields.finalizeBatch &&
          index === Number(findModalFieldIndex) + 1
        ) {
          // Update next column status if current is finalized
          if (!modalField.isOptional) {
            modalField.columnStatus = 'ADD'
          }
        }

        return modalField
      }
    )

    const batchToUpdate = {
      ...batch,
      modalFieldCombined: batchModalFieldsArr,
      isReadyForLot,
      batchStatus: isReadyForLot ? 'ready_for_lot' : 'pending'
    }

    const updatedBatch = await updateBatchColumnFields(batchToUpdate)

    const activity = {
      activityHolderId: batch._id,
      activityHolderType: 'BATCH',
      activityType: 'BATCH_UPDATE',
      rootHolderId: batch._id,
      rootHolderType: 'content.eml.Batch',
      subRootHolderId: batch._id,
      subRootHolderType: 'content.eml.Batch',
      activityDescription: `Batch: ${batch.batchName} updated`,
      isShowable: true
    }

    await activityLogger(activity)

    return updatedBatch
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to update batch: ${errorMessage}`)
  }
}

const getAllBatchCoCodes = async (query: any): Promise<any> => {
  try {
    const batchData = await getlistData(
      query,
      Batches,
      BATCH_PRE_DEFINED_FIELDS
    )
    return batchData
  } catch (err) {
    throw new Error('Error while fetching batch coCodes')
  }
}

/**
 * Get aggregated batch data with counts and statistics
 * @param query Query parameters for filtering
 * @returns Aggregated batch data
 */
const getBatchAggregations = async (
  query: Record<string, any> = {}
): Promise<any> => {
  try {
    const aggregationFields = {
      isReadyForLot: FIELD_TYPES.BOOLEAN,
      type: FIELD_TYPES.GROUPANDCOUNT,
      batchStatus: FIELD_TYPES.GROUPANDCOUNT,
      quantity: FIELD_TYPES.MINMAX
    }

    const aggregationData = await getAggregations(
      { query },
      Batches,
      aggregationFields
    )

    return { aggregationData }
  } catch (err) {
    throw new Error('Error while fetching batch aggregations')
  }
}

/**
 * Get complete batch details including associated farmers and produce information
 * @param batchId - The MongoDB ObjectId of the batch
 * @returns Batch details with associated farmer and produce information
 * @throws {Error} If batch not found or invalid data encountered
 */
const getBatchDetails = async (
  batchId: string
): Promise<BatchDetailsResponse> => {
  try {
    // Validate batchId format
    if (!mongoose.isValidObjectId(batchId)) {
      throw new Error('Invalid batch ID format')
    }

    const batch = await getBatch(batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    const { farmerArr, farmerLocationArr, farmerProduceArr } =
      await getBatchFarmersAndProduce(batch)

    return {
      batch,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to fetch batch details: ${errorMessage}`)
  }
}

export {
  getBatch,
  getBatchesByBatchIds,
  getFarmerProduceDetailsByBatchId,
  getBatchFarmersAndProduce,
  getBatchDetails,
  saveBatch,
  updateBatchLotId,
  updateBatchColumnFields,
  deleteAllBatches,
  getAllBatchCoCodes,
  getBatchAggregations,
  createBatch,
  updateBatch
}
