import type { Request } from 'express'
import mongoose from 'mongoose'
import { Farmers } from '../models'
import type { FarmerDocument } from '../models/FarmerMember.model'
import {
  getFarmerProduceDetailsByFarmerId,
  getBatch,
  getLot,
  getlistData,
  getAggregations,
  axPostActivity,
  retrieveFarmerMembersLastFetchedTime as odkGetLastFetchedTime,
  updateFarmerMembersLastFetchedTime as odkUpdateLastFetchedTime
} from '../services'
import {
  axGetFarmerMembersFromODK as odkGetFarmerMembers,
  handleFarmerDataFromODK as odkHandleFarmerData
} from './odkService'
import {
  checkAndFixGeometry,
  formatTimeStampFromUTC,
  saveLogToFile,
  unionIdToUnionName
} from '../utils'
import { FARMER_MEMBER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { ODK_FORM_DETAILS, SITE_CONFIG } from '../static/constants'
import { FIELD_TYPES } from '../utils/schema'

export interface FarmerDetails {
  farmer: FarmerDocument
  farmerProduces: any[]
  batches: any[]
  lots: any[]
}

export const getFarmerDetailsById = async (
  farmerId: string
): Promise<FarmerDocument | null> => {
  return Farmers.findById(farmerId)
}

export const getFarmerDetailsByFarmerId = async (
  farmerId: string
): Promise<FarmerDocument[]> => {
  try {
    const farmer = await Farmers.find({ farmerId })
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

export const getFarmerDetailsBySubmissionUUID = async (
  uuid: string
): Promise<FarmerDocument | null> => {
  return Farmers.findOne(
    { instanceID: uuid },
    { ...FARMER_MEMBER_PRE_DEFINED_FIELDS }
  )
}

/**
 * Updates a farmer's collection to include the linked produce
 */
export const updateFarmerCollection = async (
  farmerId: string,
  produceId: string
): Promise<FarmerDocument> => {
  try {
    const updatedFarmer = await Farmers.findByIdAndUpdate(
      farmerId,
      { $addToSet: { farmerProduceIds: produceId } },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedFarmer) {
      throw new Error('Failed to update farmer collection')
    }

    return updatedFarmer
  } catch (error) {
    throw new Error(`Error updating farmer collection: ${error.message}`)
  }
}

export const postFarmersDetail = async (
  req: Request,
  farmerInfo: Partial<FarmerDocument>
): Promise<FarmerDocument> => {
  try {
    const doesFarmerExist = await Farmers.findOne({
      instanceID: farmerInfo.instanceID
    })
    if (doesFarmerExist) {
      return doesFarmerExist
    }

    const newFarmer = new Farmers({
      ...farmerInfo,
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date().toISOString(),
      farmerProduceIds: []
    })
    await newFarmer.save()
    const activities = [
      {
        activityHolderId: newFarmer.id,
        activityHolderType: 'FARMER',
        activityType: 'FARMER_CREATION',
        rootHolderId: newFarmer.id,
        rootHolderType: 'content.eml.Farmer',
        subRootHolderId: newFarmer.id,
        subRootHolderType: 'content.eml.Farmer',
        activityDescription: `Farmer: ${newFarmer.farmerName} created`,
        isShowable: true
      },
      {
        activityHolderId: newFarmer.id,
        activityHolderType: 'FARMER',
        activityType: 'FARMER_CREATION',
        rootHolderId: newFarmer.id,
        rootHolderType: 'content.eml.Farmer',
        subRootHolderId: newFarmer.id,
        subRootHolderType: 'content.eml.Farmer',
        activityDescription: `Submitted on ODK by ${
          newFarmer.submitterName
        } at ${formatTimeStampFromUTC(newFarmer.submittedOnODK)}`,
        dateCreated: newFarmer.submittedOnODK,
        lastUpdated: newFarmer.submittedOnODK,
        isShowable: true
      }
    ]

    await Promise.all(
      activities.map(async (activity) => await axPostActivity(req, activity))
    )
    return newFarmer
  } catch (err) {
    if (err.code === 11000) {
      // 11000 is the error code for duplicate key error in MongoDB
      return null
    } else {
      throw new Error(
        `Error while saving farmer details. Error:  ${err.message}`
      )
    }
  }
}

export const getAllFarmersService = async (
  req: Request
): Promise<FarmerDocument[]> => {
  return await getlistData(req, Farmers, FARMER_MEMBER_PRE_DEFINED_FIELDS, {
    farmerName: 1
  })
}

export const getAggregatedFarmerDataService = async (
  req: Request
): Promise<any> => {
  const aggregationFields = {
    landAcreage: FIELD_TYPES.MINMAX,
    coffeeAcreage: FIELD_TYPES.MINMAX,
    noOfCoffeeTrees: FIELD_TYPES.MINMAX,
    noOfDependents: FIELD_TYPES.MINMAX,
    village: FIELD_TYPES.GROUPANDCOUNT,
    gender: FIELD_TYPES.GROUPANDCOUNT,
    levelOfEducation: FIELD_TYPES.GROUPANDCOUNT,
    otherFarmEnterprises: FIELD_TYPES.UNWINDANDGROUP,
    agroforestry: FIELD_TYPES.GROUPANDCOUNT,
    isLocationVerified: FIELD_TYPES.BOOLEAN,
    isFarmerDataValidated: FIELD_TYPES.BOOLEAN,
    yearOfFirstPlanting: FIELD_TYPES.MINMAX,
    noOfFarmPlots: FIELD_TYPES.MINMAX,
    enumerator: FIELD_TYPES.GROUPANDCOUNT
  }

  return await getAggregations(req, Farmers, aggregationFields)
}

export const createFarmerService = async (
  req: Request,
  productId: string,
  unionCodes: number[],
  farmerData: Partial<FarmerDocument>
): Promise<FarmerDocument> => {
  const farmer = {
    product: new mongoose.Types.ObjectId(productId),
    ...farmerData
  }

  if (!unionCodes.includes(Number(farmer.unionCode))) {
    throw new Error('Not authorized to create this farmer')
  }

  const savedFarmer = await postFarmersDetail(req, farmer)

  // Create activities after farmer creation
  const activities = [
    {
      activityHolderId: savedFarmer.id,
      activityHolderType: 'FARMER',
      activityType: 'FARMER_CREATION',
      rootHolderId: savedFarmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: savedFarmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: `Farmer: ${savedFarmer.farmerName} created`,
      isShowable: true
    },
    {
      activityHolderId: savedFarmer.id,
      activityHolderType: 'FARMER',
      activityType: 'FARMER_CREATION',
      rootHolderId: savedFarmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: savedFarmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: `Submitted on ODK by ${
        savedFarmer.submitterName
      } at ${formatTimeStampFromUTC(savedFarmer.submittedOnODK)}`,
      dateCreated: savedFarmer.submittedOnODK,
      lastUpdated: savedFarmer.submittedOnODK,
      isShowable: true
    }
  ]

  await Promise.all(
    activities.map(async (activity) => await axPostActivity(req, activity))
  )

  return savedFarmer
}

export const fetchFarmerMembersFromODKCronService = async (
  req: Request
): Promise<any[]> => {
  const results = []
  for (const [key] of Object.entries(ODK_FORM_DETAILS)) {
    const LastFetchedTime = await odkGetLastFetchedTime(key)
    const data = await odkGetFarmerMembers(
      LastFetchedTime,
      ODK_FORM_DETAILS[key].FORM_ID,
      ODK_FORM_DETAILS[key].FORM_NAME
    )

    const updatedLastFetchedTime = new Date().toISOString()

    if (!data || typeof data === 'undefined') {
      results.push({ key, message: 'Data is undefined' })
      continue
    }

    const lengthOfData = data?.value?.length || 0

    if (lengthOfData === 0) {
      await odkUpdateLastFetchedTime(updatedLastFetchedTime, key)
      results.push({ key, message: 'No new data found' })
      continue
    }

    if (data.value) {
      const result = await odkHandleFarmerData(req, data, key)
      await odkUpdateLastFetchedTime(updatedLastFetchedTime, key)

      const output = {
        key,
        message:
          'Data fetching from ODK is completed. Data is synced to server now.',
        LastFetchedTime,
        updatedLastFetchedTime,
        lengthOfData: data.value.length,
        success: result.success,
        processedCount: lengthOfData - result.errors.length,
        errorCount: result.errors.length
      }

      if (result.errors && result.errors.length > 0) {
        output.message += ' Some errors occurred during processing.'
        result.errors.forEach((err) => {
          saveLogToFile(err, 'fetchFarmerMemberFromODKAPI', true)
        })
      }

      results.push(output)
    }
  }

  return results
}

export const fetchFarmerMembersFromODKOnDemandService = async (
  req: Request,
  keyParam: string
): Promise<{
  message: string
  LastFetchedTime?: string
  updatedLastFetchedTime?: string
  lengthOfData?: number
  success?: boolean
  processedCount?: number
  errorCount?: number
}> => {
  const key = unionIdToUnionName(Number(keyParam))

  if (!key || ODK_FORM_DETAILS[key] === undefined) {
    throw new Error('Key is required')
  }

  const LastFetchedTime = await odkGetLastFetchedTime(key)

  const data = await odkGetFarmerMembers(
    LastFetchedTime,
    ODK_FORM_DETAILS[key].FORM_ID,
    ODK_FORM_DETAILS[key].FORM_NAME
  )

  const updatedLastFetchedTime = new Date().toISOString()

  if (!data || typeof data === 'undefined') {
    throw new Error('Data is undefined')
  }

  const lengthOfData = data?.value?.length || 0

  if (lengthOfData === 0) {
    await odkUpdateLastFetchedTime(updatedLastFetchedTime, key)
    const output = { message: 'No new data found' }
    saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')
    return output
  }

  if (data.value) {
    const result = await odkHandleFarmerData(req, data, key)
    await odkUpdateLastFetchedTime(updatedLastFetchedTime, key)

    const output = {
      message:
        'Data fetching from ODK is completed. Data is synced to server now.',
      LastFetchedTime,
      updatedLastFetchedTime,
      lengthOfData: data.value.length,
      success: result.success,
      processedCount: lengthOfData - result.errors.length,
      errorCount: result.errors.length
    }

    if (result.errors && result.errors.length > 0) {
      output.message += ' Some errors occurred during processing.'
      result.errors.forEach((err: any) => {
        saveLogToFile(err, 'fetchFarmerMemberFromODKAPI', true)
      })
    }

    saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')
    return output
  }

  throw new Error('Unexpected error occurred')
}

export const getFarmersByUnionService = async (
  unionCode: number
): Promise<FarmerDocument[]> => {
  return Farmers.find(
    {
      unionCode,
      isDeleted: false
    },
    {
      farmerId: 1,
      farmerName: 1,
      cc: 1,
      location: 1,
      noOfFarmPlots: 1,
      centroid: 1
    }
  )
}

export const getFarmerDetailsService = async (
  farmerId: string
): Promise<FarmerDetails> => {
  const farmer = await getFarmerDetailsById(farmerId)
  if (!farmer) {
    throw new Error('Invalid farmer id found')
  }

  const farmerProduceArr = await getFarmerProduceDetailsByFarmerId(
    farmer.farmerId
  )

  const batchPromises = farmerProduceArr.map(async (produce) => {
    if (produce?.batchIdMongo) {
      const batchObj = await getBatch(produce.batchIdMongo)
      if (Object.keys(batchObj).length > 0) {
        const lotObj = await getLot(batchObj.lotIdMongo)
        if (lotObj !== null) {
          return { batchObj, lotObj }
        }
        return { batchObj }
      }
    }
    return null
  })

  const results = await Promise.all(batchPromises)
  const batchArr = results
    .filter((result) => result?.batchObj)
    .map((result) => result.batchObj)
  const lotArr = results
    .filter((result) => result?.lotObj)
    .map((result) => result.lotObj)

  return {
    farmer,
    farmerProduces: farmerProduceArr,
    batches: batchArr,
    lots: lotArr
  }
}

export const getFarmerByIdService = async (
  farmerId: string
): Promise<FarmerDocument> => {
  const farmer = await getFarmerDetailsById(farmerId)
  if (!farmer) {
    throw new Error('Invalid farmer id found')
  }
  return farmer
}

export const getFarmerByUUIDService = async (
  farmerUUID: string
): Promise<FarmerDocument> => {
  const farmer = await getFarmerDetailsBySubmissionUUID(farmerUUID)
  if (!farmer) {
    throw new Error('Invalid farmer id found')
  }
  return farmer
}

export const updateFarmerService = async (
  req: Request,
  farmerId: string,
  unionCodes: number[],
  payload: Partial<FarmerDocument>
): Promise<FarmerDocument> => {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error('Payload cannot be empty')
  }

  const farmer = await Farmers.findById(farmerId)

  if (!farmer) {
    throw new Error('Farmer not found')
  }

  if (!unionCodes.includes(Number(farmer.unionCode))) {
    throw new Error('Not authorized to modify this farmer')
  }

  const updateObject = {
    ...payload,
    lastUpdatedAt: new Date().toISOString()
  }

  if (payload.location) {
    const { location, centroids } = checkAndFixGeometry(payload.location)
    updateObject.location = location
    updateObject.centroid = centroids
    updateObject.noOfFarmPlots = payload.location.features.length
  }

  const updatedFarmer = Farmers.findByIdAndUpdate(farmerId, updateObject, {
    new: true,
    runValidators: true
  })

  Object.keys(payload).forEach((key) => {
    const activity = {
      activityHolderId: farmer.id,
      activityHolderType: 'FARMER',
      activityType: 'FARMER_UPDATE',
      rootHolderId: farmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: farmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: `Updated ${key} from ${JSON.stringify(
        farmer[key]
      )} to ${JSON.stringify(payload[key])}`,
      isShowable: true
    }
    void axPostActivity(req, activity)
  })
  if (updatedFarmer) {
    return updatedFarmer
  } else {
    throw new Error('Failed to update farmer')
  }
}

export const deleteFarmerService = async (
  req: Request,
  farmerId: string
): Promise<FarmerDocument> => {
  const farmer = await Farmers.findByIdAndUpdate(
    farmerId,
    { isDeleted: true },
    { new: true }
  )

  if (!farmer) {
    throw new Error('Farmer not found')
  }

  const timestamp = new Date().toISOString()
  const activity = {
    activityHolderId: farmer.id,
    activityHolderType: 'FARMER',
    lastUpdated: timestamp,
    activityType: 'FARMER_DELETION',
    rootHolderId: farmer.id,
    rootHolderType: 'content.eml.Farmer',
    subRootHolderId: farmer.id,
    subRootHolderType: 'content.eml.Farmer',
    activityDescription: null,
    isShowable: true
  }
  await axPostActivity(req, activity)

  return farmer
}
