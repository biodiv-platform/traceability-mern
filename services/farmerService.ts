import {
  SITE_CONFIG,
  ODK_REVIEW_STATUS,
  ODK_FORM_DETAILS,
  AGROFORESTRY_TYPES
} from '../static/constants'
import { Farmers } from '../models'
import axios from 'axios'
import { axPostActivity, saveLastFetchedFarmerMember } from '../services'
import {
  type CreateFarmerInput,
  type IFarmerMember
} from '../interfaces/traceability'
import {
  checkAndFixGeometry,
  convertToFeatureCollection,
  deconstructObject,
  formatTimeStampFromUTC
} from '../utils'
import {
  BUZAAYA_SCHEMA,
  BUZAAYA_KEYMAP,
  NORTHERN_UGANDA_SCHEMA,
  NORTHERN_UGANDA_KEYMAP
} from '../schema'
import { FARMER_MEMBER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
const mongoose = require('mongoose')
// const db = mongoose.connection

const SCHEMAS = {
  BUZAAYA_SCHEMA,
  NORTHERN_UGANDA_SCHEMA
}

const KEYMAPS = {
  BUZAAYA_KEYMAP,
  NORTHERN_UGANDA_KEYMAP
}

const getFarmerDetailsById = async (
  farmerId: string
): Promise<IFarmerMember | null> => {
  try {
    const farmer = await Farmers.findOne({
      _id: farmerId,
      isDeleted: false
    })
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getFarmerDetailsByFarmerId = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await Farmers.find({ farmerId })
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getFarmerDetailsBySubmissionUUID = async (
  farmerSubmissionUUID: string
): Promise<any> => {
  try {
    const farmer = await Farmers.findOne(
      { instanceID: farmerSubmissionUUID },
      { ...FARMER_MEMBER_PRE_DEFINED_FIELDS }
    ) // FIXME: should we include isDeleted farmer while getting farmer data?

    if (!farmer) {
      // TODO: Throw error below
      return {
        farmerId: null,
        ccCode: null,
        coCode: null,
        unionCode: null
      }
    }
    return farmer
  } catch (err) {
    return {
      farmerId: null,
      ccCode: null,
      coCode: null,
      unionCode: null
    }
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

const postFarmersDetail = async (
  farmerInfo: CreateFarmerInput
): Promise<IFarmerMember> => {
  try {
    const doesFarmerExist = await Farmers.findOne({
      instanceID: farmerInfo.instanceID
    })
    if (doesFarmerExist) {
      return doesFarmerExist
    }

    const db = mongoose.connection
    const count = await db.collection('farmermembers').countDocuments()
    const farmerId = `BUZ-${(Number(count) + 1).toString().padStart(3, '0')}`
    const newFarmer = new Farmers({
      ...farmerInfo,
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date().toISOString(),
      farmerId,
      farmerProduceIds: [],
      id: Number(count) + 1
    })
    await newFarmer.save()
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

const updateBatchIdInFarmerDetails = async (
  farmerId: string,
  batchId: string
): Promise<any> => {
  try {
    // code to update document in mongodb
    const updatedFarmer = await Farmers.findByIdAndUpdate(
      farmerId,
      {
        $push: { batchIds: batchId }
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

const updateFarmerProduceIdInFarmerDetails = async (
  farmerId: string,
  farmerProduceId: string
): Promise<any> => {
  try {
    // code to update document in mongodb
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

const axGetFarmerMembersFromODK = async (
  LastFetchedTime: string | Date,
  formId: number,
  formName: string
): Promise<any> => {
  try {
    const config = {
      method: 'get',
      url: `${SITE_CONFIG.ODK_FARMER_MEMBER_API}/projects/${formId}/forms/${formName}/submissions?gtDate=${LastFetchedTime}`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }

    const { data } = await axios(config)
    return data
  } catch (error) {
    throw new Error(
      `Error while fetching farmer members from ODK. Error: ${error.message}`
    )
  }
}

const axGetCodesFromODKData = async (
  ccString: string
): Promise<{
  ccCode: string
  coCode: string
  unionCode: string
}> => {
  try {
    const config = {
      method: 'get',
      url: `${SITE_CONFIG.ENTITIES_API}cc/name/${ccString}`,
      headers: {
        accept: 'application/json'
      }
    }

    const res = await axios(config)

    const { data } = res

    return {
      ccCode: data.code,
      coCode: data.cooperativeCode,
      unionCode: data.unionCode
    }
  } catch (error) {
    throw new Error(
      `Error while getting cc codes from ODK data. Error: ${error.message}`
    )
  }
}

const axGetLocationByUUID = async (
  farmerUUID: string,
  formId: number,
  formName: string
): Promise<{
  type: 'FeatureCollection'
  features: 'Feature'
}> => {
  try {
    const config = {
      method: 'get',
      url: `${SITE_CONFIG.ODK_FARMER_MEMBER_API}/projects/${formId}/forms/${formName}/submissions/location/${farmerUUID}`,
      headers: {
        accept: 'application/json'
      }
    }

    const { data } = await axios(config)

    return {
      type: data.type,
      features: data.features
    }
  } catch (error) {
    throw new Error(
      `Error while getting location by UUID from ODK. UUID: ${farmerUUID}, Error: ${error.message}`
    )
  }
}

const processBatch = async (batchFarmerData, req): Promise<void> => {
  try {
    const result = await postFarmersDetailBatch(batchFarmerData)

    for (const farmer of result.insertedFarmers) {
      const activity = {
        activityHolderId: farmer.id,
        activityHolderType: 'FARMER',
        activityType: 'FARMER_CREATION',
        rootHolderId: farmer.id,
        rootHolderType: 'content.eml.Farmer',
        subRootHolderId: farmer.id,
        subRootHolderType: 'content.eml.Farmer',
        activityDescription: `Farmer: ${farmer.farmerName} created`,
        isShowable: true
      }
      await axPostActivity(req, activity)

      const odkSubmissionActivity = {
        activityHolderId: farmer.id,
        activityHolderType: 'FARMER',
        activityType: 'FARMER_CREATION',
        rootHolderId: farmer.id,
        rootHolderType: 'content.eml.Farmer',
        subRootHolderId: farmer.id,
        subRootHolderType: 'content.eml.Farmer',
        activityDescription: `Submitted on ODK by ${
          farmer.submitterName
        } at ${formatTimeStampFromUTC(farmer.submittedOnODK)}`,
        dateCreated: farmer.submittedOnODK,
        lastUpdated: farmer.submittedOnODK,
        isShowable: true
      }

      await axPostActivity(req, odkSubmissionActivity)
    }

    if (result.insertedFarmers.length > 0) {
      const lastInsertedFarmer =
        result.insertedFarmers[result.insertedFarmers.length - 1]
      await saveLastFetchedFarmerMember(lastInsertedFarmer._id) // Do we need to separate last fetched farmer member by union name?
    }

    if (result.failedFarmers.length > 0) {
      console.error(`Failed to insert ${result.failedFarmers.length} farmers:`)
      result.failedFarmers.forEach((farmer) => {
        console.error(
          `InstanceID: ${farmer.instanceID},\nIndex:${
            farmer.index
          },\nError: ${JSON.stringify(farmer.error, null, 2)}`
        )
      })
    }
  } catch (err) {
    console.error(`Error processing batch: ${err.message}`)
  }
}

const postFarmersDetailBatch = async (
  farmerInfoArray: any[]
): Promise<{ insertedFarmers: IFarmerMember[]; failedFarmers: any[] }> => {
  try {
    const insertedFarmers = await Farmers.insertMany(farmerInfoArray, {
      ordered: false
    })
    return {
      insertedFarmers,
      failedFarmers: []
    }
  } catch (err: any) {
    const insertedFarmers = err.insertedDocs || err.result?.insertedDocs || []
    const failedFarmers = []

    if (err.writeErrors) {
      err.writeErrors.forEach((writeError) => {
        const { instanceID } = farmerInfoArray[writeError.index]
        failedFarmers.push({
          instanceID,
          index: writeError.index,
          error: {
            code: writeError.err.code,
            errmsg: writeError.err.errmsg
          }
        })
      })
    }

    console.warn(
      `Encountered ${failedFarmers.length} errors during batch insert`
    )
    return { insertedFarmers, failedFarmers }
  }
}

export const testCountDocumentsPerformance = async (): Promise<void> => {
  console.time('countDocuments')
  const db = mongoose.connection
  const count = await db.collection('farmermembers').countDocuments()
  console.timeEnd('countDocuments')
  console.log(`Total documents: ${count}`)
}

const handleFarmerDataFromODK = async (
  req: any = {},
  data: any,
  key: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = []

  try {
    const { value } = data

    // Process farmers in batches of 100
    const BATCH_SIZE = 100
    let batchFarmerData = []
    let processedCount = 0

    for (let i = 0; i < value.length; i++) {
      try {
        const farmerRecord = value[i]
        let farmerData = deconstructObject(
          farmerRecord,
          SCHEMAS[ODK_FORM_DETAILS[key].SCHEMA],
          KEYMAPS[ODK_FORM_DETAILS[key].KEYMAP]
        )

        // Skip rejected records
        if (farmerData.reviewState === ODK_REVIEW_STATUS.REJECTED) {
          continue
        }

        // Process the data as before
        if (key === 'NorthernUganda-Union-Farmer-Registraion') {
          farmerData.noOfDependents =
            farmerData.confirmNoOfDependents === null
              ? Number(farmerData.noOfDependents)
              : Number(farmerData.confirmNoOfDependents)
          farmerData.landAcreage =
            farmerData.confirmLandAcreage === null
              ? Number(farmerData.landAcreage)
              : Number(farmerData.confirmLandAcreage)
          farmerData.noOfCoffeeTrees =
            farmerData.confirmNoOfCoffeeTrees === null
              ? Number(farmerData.noOfCoffeeTrees)
              : Number(farmerData.confirmNoOfCoffeeTrees)
        }

        const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(
          farmerData.cc
        )
        const db = mongoose.connection
        const initialCount: number = await db
          .collection('farmermembers')
          .countDocuments({ unionCode })

        const countIds: number = await db
          .collection('farmermembers')
          .countDocuments()

        let location: any = {}
        let centroid = null
        let noOfFarmPlots = 0

        // for Norther uganda farmLocation, we have to make an extra api call
        if (key === 'Buzaaya-Union-Farmer-Registraion') {
          const result = convertToFeatureCollection(farmerData?.farmLocation)
          if (result.location !== null) {
            location = result.location
            centroid = result.centroid
            noOfFarmPlots = result.centroid.coordinates.length
          } else {
            console.error('Error processing the geometry')
          }
        } else if (key === 'NorthernUganda-Union-Farmer-Registraion') {
          location = await axGetLocationByUUID(
            farmerData.instanceID,
            ODK_FORM_DETAILS[key].FORM_ID,
            ODK_FORM_DETAILS[key].FORM_NAME
          )

          const result = checkAndFixGeometry(location)
          if (result.location !== null) {
            location = result.location
            centroid = result.centroids
            noOfFarmPlots = result.centroids.coordinates.length
          } else {
            console.error(
              `Error processing the geometry of farmer ${farmerData.instanceID}`
            )
          }
        }

        const otherFarmEnterprises =
          farmerData.otherFarmEnterprises?.split(' ') ?? []
        const agroforestry =
          farmerData.agroforestry === 'Yes'
            ? AGROFORESTRY_TYPES.YES
            : AGROFORESTRY_TYPES.NO

        const unionName = key.slice(0, 3).toUpperCase()
        const farmerId = `${unionName}-${(initialCount + processedCount + 1)
          .toString()
          .padStart(3, '0')}`

        farmerData = {
          ...farmerData,
          ccCode,
          coCode,
          unionCode,
          location,
          centroid,
          noOfFarmPlots,
          isFarmerDataValidated: false,
          flag: false,
          flagReason: [''],
          otherFarmEnterprises,
          agroforestry,
          farmerId,
          id: countIds + processedCount + 1,
          product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
          createdAt: new Date().toISOString(),
          farmerProduceIds: []
        }

        /*
        uncomment in case of inserting records one by one instead of batch
        pseudo code : call postFarmersDetail func with farmerData args. await that call
        */

        await postFarmersDetail(farmerData)

        /* UNCOMMENT for batch processing
        //  Add processed farmer data to the batch array
        batchFarmerData.push(farmerData)
        processedCount++

        // If we've reached the batch size, process the batch
        if (batchFarmerData.length === BATCH_SIZE) {
          await processBatch(batchFarmerData, req)
          batchFarmerData = []
        }
        */
      } catch (error) {
        const errorMessage = `Error processing farmer with instanceID: ${
          value[i]?.meta?.instanceID || 'unknown'
        }. Error: ${error.message}`
        console.error(errorMessage)
        errors.push(errorMessage)
      }
    }

    // Process any remaining farmers
    if (batchFarmerData.length > 0) {
      await processBatch(batchFarmerData, req)
    }

    return { success: true, errors }
  } catch (error) {
    console.error(`Error in handleFarmerDataFromODK: ${error.message}`)
    errors.push(`General error in handleFarmerDataFromODK: ${error.message}`)
    return { success: false, errors }
  }
}

const editFarmerById = async (req, res, next): Promise<any> => {
  try {
    const { farmerId } = req.params
    const farmer = await Farmers.findById(farmerId)

    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }

    const updatedFarmer = await Farmers.findByIdAndUpdate(
      farmerId,
      {
        $set: {
          ...req.body
        }
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedFarmer) {
      throw new Error('Document not found')
    }

    // TODO: add activity log

    res.status(200).json(updatedFarmer)
  } catch (err) {
    res.status(500).json({
      message: `Error while updating farmer details. Error: ${err.message}`
    })
    next(err)
  }
}

export {
  getFarmerDetailsById,
  getFarmerDetailsByFarmerId,
  getFarmerDetailsBySubmissionUUID,
  getFarmersDetailAfterTimestamp,
  postFarmersDetail,
  updateBatchIdInFarmerDetails,
  updateFarmerProduceIdInFarmerDetails,
  updateFarmerCollection,
  handleFarmerDataFromODK,
  axGetFarmerMembersFromODK,
  editFarmerById,
  axGetCodesFromODKData,
  axGetLocationByUUID
}
