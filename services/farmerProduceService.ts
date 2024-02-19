import { FarmerProduce } from '../models'
import axios from 'axios'
import {
  FARMER_PRODUCE_ODK_FORM_DETAILS,
  ODK_REVIEW_STATUS,
  SITE_CONFIG
} from '../static/constants'
import {
  getFarmerDetailsBySubmissionUUID,
  saveLastFetchedFarmerProduce
} from '../services'
const mongoose = require('mongoose')

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
    const farmerProduceId = (Number(count) + 1).toString().padStart(3, '0')
    const newFarmerProduce = new FarmerProduce({
      ...farmerProduceInfo,
      farmerProduceId,
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      dateOfCollection: new Date(farmerProduceInfo.dateOfCollection),
      isDeleted: false
    })
    await newFarmerProduce.save()
    return newFarmerProduce
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

const axGetFarmerProduceFromODK = async (
  LastFetchedTime: string
): Promise<any> => {
  try {
    const { FORM_ID, FORM_NAME } = FARMER_PRODUCE_ODK_FORM_DETAILS

    const config = {
      method: 'get',
      url: `${SITE_CONFIG.ODK_FARMER_MEMBER_API}/projects/${FORM_ID}/forms/${FORM_NAME}/submissions?gtDate=${LastFetchedTime}`,
      headers: {
        accept: 'application/json'
      }
    }

    const { data } = await axios(config)
    return data
  } catch (error) {
    throw new Error('Error while getting farmer produce data from ODK')
  }
}

const handleFarmerProduceDataFromODK = async (data: any): Promise<any> => {
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

      const { _id: farmerProduceId } = await postFarmerProduceDetail({
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
        flag,
        flagReason
      })

      // update product db with last farmer produce submitted
      await saveLastFetchedFarmerProduce(farmerProduceId)
    }

    return { success: true }
  } catch (error) {
    console.log('error', error)
    throw new Error(
      `Error while handling farmer data from ODK. Error: ${error.message}`
    )
  }
}

// below code is used in development env to delete the farmer data from db
// eslint-disable-next-line
const deleteAllFarmersProduce = async (): Promise<any> => {
  try {
    const deletedFarmer = await FarmerProduce.deleteMany({})
    return deletedFarmer
  } catch (err) {
    throw new Error('Error while deleting farmer details')
  }
}

export {
  getFarmerProduceDetailsById,
  getFarmerProduceDetailsByFarmerId,
  postFarmerProduceDetail,
  updateBatchIdInFarmerProduceDetails,
  handleFarmerProduceDataFromODK,
  axGetFarmerProduceFromODK
}
