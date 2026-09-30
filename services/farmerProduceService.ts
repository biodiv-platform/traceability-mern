import { FarmerProduce } from '../models'
import axios from 'axios'
import {
  ODK_REVIEW_STATUS,
  SITE_CONFIG,
  ODK_FORM_DETAILS
} from '../static/constants'
import {
  axPostActivity,
  getFarmerDetailsBySubmissionUUID,
  saveLastFetchedFarmerProduce,
  getlistData,
  getAggregations,
  retrieveFarmerProduceLastFetchedTime,
  updateFarmerProduceLastFetchedTime
} from '../services'
import { formatTimeStampFromUTC, saveLogToFile, unionIdToUnionName } from '../utils'
import mongoose from 'mongoose'
import type { Request } from 'express'

const getFarmerProduceDetailsById = async (
  farmerProduceId: string
): Promise<any> => {
  try {
    const farmer = await FarmerProduce.findById(farmerProduceId)
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getFarmerProduceDetailsByFarmerId = async (
  farmerId: string
): Promise<any> => {
  try {
    const farmer = await FarmerProduce.find({ farmerId })
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const postFarmerProduceDetail = async (
  farmerProduceInfo: any
): Promise<any> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('farmerproduceinfos').countDocuments()
    const farmerProduceId = `FP-${(Number(count) + 1)
      .toString()
      .padStart(3, '0')}`
    const newFarmerProduce = new FarmerProduce({
      ...farmerProduceInfo,
      farmerProduceId,
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      dateOfCollection: new Date(farmerProduceInfo.dateOfCollection),
      isDeleted: false,
      id: Number(count) + 1
    })
    await newFarmerProduce.save()

    return newFarmerProduce
  } catch (err) {
    if (err.code === 11000) {
      // 11000 is the error code for duplicate key error in MongoDB
      const output = {
        message: `Skipped duplicate record with _id: ${farmerProduceInfo.instanceID}`
      }
      console.error(output.message)
      // Save output to file
      saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

      return null
    } else {
      throw new Error(
        `Error while saving farmer details. Error:  ${err.message}`
      )
    }
  }
}

const updateBatchIdInFarmerProduceDetails = async (
  farmerProduceIdMongo: string,
  batchId: string,
  batchIdMongo: string,
  produceStatus: string
): Promise<any> => {
  try {
    // code to update document in mongodb
    const updatedFarmer = await FarmerProduce.findByIdAndUpdate(
      farmerProduceIdMongo,
      {
        batchId,
        batchIdMongo,
        produceStatus
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

const axGetFarmerProduceFromODK = async (
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
    return new Error(
      `Error while getting farmer produce data from ODK. Error: ${error.message}`
    )
  }
}

const handleFarmerProduceDataFromODK = async (
  req: any = {},
  data: any,
  key: string
): Promise<boolean> => {
  try {
    const { value } = data

    for (const farmerProduceRecord of value) {
      // get farmer details
      let { farmerId, ccCode, coCode, unionCode } =
        await getFarmerDetailsBySubmissionUUID(
          farmerProduceRecord.farmer_member.submissionUUID
        )

      const {
        farmer_member: { farmer: farmerName, submissionUUID: farmerEID },
        contact_no: contactNo,
        produce_details: {
          type_of_coffee: produceType,
          quantity,
          no_of_bags: noOfBags,
          deduction,
          deduction_reason: deductionReason,
          net_collection: netCollection
        },
        price_details: {
          price_per_kg: pricePerKg,
          amount_paid_calculate: amountPaidCalculate,
          milling_charge: millingCharge,
          date_of_collection: dateOfCollection
        },
        collection_details: {
          name_collector: collectorName,
          collector_substr: collectorSubstr,
          calculate_grn: calculateGrn,
          location: produceLocation,
          grn_recipt: grnReceipt
        },
        meta: { instanceID, instanceName },
        __system: {
          submissionDate: submittedOnODK,
          submitterName,
          reviewState,
          edits,
          formVersion
        }
      } = farmerProduceRecord

      if (reviewState === ODK_REVIEW_STATUS.REJECTED) {
        continue
      }

      let flag = false

      const flagReason = []

      if (farmerId === null) {
        farmerId = null
        ccCode = null
        coCode = null
        unionCode = null

        flag = true

        flagReason.push('Farmer Data Invalid')
      }

      let location = null

      if (produceLocation !== null) {
        location = {
          type: produceLocation.type,
          coordinates: produceLocation?.coordinates?.slice(0, 2) ?? null,
          accuracy: produceLocation?.properties?.accuracy ?? null
        }
      }
      // default produce status is ready for batch
      const produceStatus = 'ready_for_batch'

      const resp = await postFarmerProduceDetail({
        farmerId,
        farmerName,
        contactNo,
        produceType,
        quantity,
        noOfBags,
        deduction,
        deductionReason,
        netCollection,
        pricePerKg,
        amountPaidCalculate,
        millingCharge,
        dateOfCollection,
        collectorName,
        collectorSubstr,
        calculateGrn,
        location,
        grnReceipt,
        farmerEID,
        instanceID,
        instanceName,
        submittedOnODK,
        submitterName,
        formVersion,
        reviewState,
        edits,
        ccCode,
        coCode,
        unionCode,
        produceStatus,
        flag,
        flagReason
      })

      if (resp === null) {
        // skipping the duplicate record
        continue
      }

      const activity = {
        activityHolderId: resp.id,
        activityHolderType: 'FARMER_PRODUCE',
        activityType: 'FARMER_PRODUCE_CREATED',
        rootHolderId: resp.id,
        rootHolderType: 'content.eml.FarmerProduce',
        subRootHolderId: resp.id,
        subRootHolderType: 'content.eml.FarmerProduce',
        activityDescription: '',
        isShowable: true
      }

      await axPostActivity(req, activity)

      const odkSubmissionActivity = {
        activityHolderId: resp.id,
        activityHolderType: 'FARMER_PRODUCE',
        activityType: 'FARMER_PRODUCE_CREATED',
        rootHolderId: resp.id,
        rootHolderType: 'content.eml.FarmerProduce',
        subRootHolderId: resp.id,
        subRootHolderType: 'content.eml.FarmerProduce',
        activityDescription: `Submitted on ODK by ${
          resp.submitterName
        } at ${formatTimeStampFromUTC(resp.submittedOnODK)}`,
        dateCreated: resp.submittedOnODK,
        lastUpdated: resp.submittedOnODK,
        isShowable: true
      }
      await axPostActivity(req, odkSubmissionActivity)

      await saveLastFetchedFarmerProduce(resp._id)
    }

    return true
  } catch (error) {
    throw new Error(
      `Error while handling farmer data from ODK. Error: ${error.message}`
    )
  }
}

const getAllFarmerProduce = async (
  req: Request,
  preDefinedFields: Record<string, unknown>
): Promise<unknown> => {
  return await getlistData(req, FarmerProduce, preDefinedFields)
}

const getFarmerProduceAggregation = async (
  req: Request,
  aggregationFields: Record<string, string>
): Promise<unknown> => {
  return await getAggregations(req, FarmerProduce, aggregationFields)
}

const fetchFarmerProduceFromODKCron = async (
  req: Request
): Promise<unknown[]> => {
  const results = []

  for (const [key] of Object.entries(ODK_FORM_DETAILS)) {
    const LastFetchedTime = await retrieveFarmerProduceLastFetchedTime(key)

    if (
      ODK_FORM_DETAILS[key].FP_FORM_ID === null ||
      ODK_FORM_DETAILS[key].FP_FORM_NAME === null
    ) {
      results.push({ key, message: 'Form ID or Form Name Doesnt exist' })
      continue
    }

    const data = await axGetFarmerProduceFromODK(
      LastFetchedTime,
      ODK_FORM_DETAILS[key].FP_FORM_ID,
      ODK_FORM_DETAILS[key].FP_FORM_NAME
    )

    const updatedLastFetchedTime = new Date().toISOString()

    if (data === undefined) {
      results.push({ key, message: 'Data is undefined' })
      continue
    }

    const lengthOfData = data?.value?.length || 0

    if (lengthOfData === 0) {
      await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key)
      results.push({ key, message: 'No new data found' })
      continue
    }

    if (data.value !== undefined) {
      await handleFarmerProduceDataFromODK(req, data, key)
      await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key)

      results.push({
        key,
        message:
          'Data fetching from ODK is completed. Data is synced to server now.',
        LastFetchedTime,
        updatedLastFetchedTime,
        lengthOfData: data.value.length
      })
    }
  }

  return results
}

const fetchFarmerProduceFromODKOnDemand = async (
  req: Request,
  keyParam: string
): Promise<unknown> => {
  const key = unionIdToUnionName(Number(keyParam))

  if (!key || ODK_FORM_DETAILS[key] === undefined) {
    throw new Error('Key is required')
  }

  const LastFetchedTime = await retrieveFarmerProduceLastFetchedTime(key)

  const data = await axGetFarmerProduceFromODK(
    LastFetchedTime,
    ODK_FORM_DETAILS[key].FP_FORM_ID,
    ODK_FORM_DETAILS[key].FP_FORM_NAME
  )

  const updatedLastFetchedTime = new Date().toISOString()
  const lengthOfData = data?.value?.length

  if (data === undefined) {
    throw new Error('Data is undefined')
  }

  if (data !== undefined && lengthOfData === 0) {
    await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key)
    return { message: 'No new data found' }
  }

  if (data.value !== undefined) {
    await handleFarmerProduceDataFromODK(req, data, key)
    await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key)

    return {
      message:
        'Data fetching from odk is completed. Data is synced to server now.',
      LastFetchedTime,
      updatedLastFetchedTime,
      lengthOfData: data.value.length
    }
  }
}

export {
  getFarmerProduceDetailsById,
  getFarmerProduceDetailsByFarmerId,
  postFarmerProduceDetail,
  updateBatchIdInFarmerProduceDetails,
  handleFarmerProduceDataFromODK,
  axGetFarmerProduceFromODK,
  getAllFarmerProduce,
  getFarmerProduceAggregation,
  fetchFarmerProduceFromODKCron,
  fetchFarmerProduceFromODKOnDemand
}
