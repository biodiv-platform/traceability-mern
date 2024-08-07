import {
  SITE_CONFIG,
  ODK_REVIEW_STATUS,
  FARMER_MEMBER_ODK_FORM_DETAILS,
  AGROFORESTRY_TYPES
} from '../static/constants'
import { Farmers } from '../models'
import axios from 'axios'
import { saveLastFetchedFarmerMember } from '../services'
import { type FarmerMember } from '../interfaces/traceability'
import { deconstructObject } from '../utils'
import {
  BUZAAYA_SCHEMA,
  BUZAAYA_KEYMAP,
  NORTHERN_UGANDA_SCHEMA,
  NORTHERN_UGANDA_KEYMAP
} from '../schema'
const mongoose = require('mongoose')

const SCHEMAS = {
  BUZAAYA: BUZAAYA_SCHEMA,
  NORTHERN_UGANDA: NORTHERN_UGANDA_SCHEMA
}

const KEYMAPS = {
  BUZAAYA: BUZAAYA_KEYMAP,
  NORTHERN_UGANDA: NORTHERN_UGANDA_KEYMAP
}

const getFarmerDetailsById = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await Farmers.findById(farmerId)
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getFarmerDetailsBySubmissionUUID = async (
  farmerSubmissionUUID: string
): Promise<any> => {
  try {
    const farmer = await Farmers.findOne({ instanceID: farmerSubmissionUUID }) // FIXME: should we include isDeleted farmer while getting farmer data?

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

const postFarmersDetail = async (farmerInfo: any): Promise<FarmerMember> => {
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
      farmerProduceIds: []
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
  type:
    | 'Point'
    | 'Polygon'
    | 'LineString'
    | 'MultiPoint'
    | 'MultiLineString'
    | 'MultiPolygon'
    | 'GeometryCollection'
    | 'Feature'
    | 'FeatureCollection'
  coordinates: number[]
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
      coordinates: data.coordinates.slice(0, 2)
    }
  } catch (error) {
    throw new Error(
      `Error while getting location by UUID from ODK. UUID: ${farmerUUID}, Error: ${error.message}`
    )
  }
}

const handleFarmerDataFromODK = async (
  data: any,
  key: string
): Promise<boolean> => {
  try {
    const { value } = data

    for (const farmerRecord of value) {
      let farmerData = deconstructObject(
        farmerRecord,
        SCHEMAS[FARMER_MEMBER_ODK_FORM_DETAILS[key].SCHEMA],
        KEYMAPS[FARMER_MEMBER_ODK_FORM_DETAILS[key].KEYMAP]
      )

      /*
      Future Case: validate farmer data
      */
      const isFarmerDataValidated = false

      const flag = false
      const flagReason = ['']

      if (key === 'NORTHERN_UGANDA') {
        farmerData.noOfDependents =
          farmerData.confirmNoOfDependents === null
            ? farmerData.noOfDependents
            : farmerData.confirmNoOfDependents

        farmerData.landAcreage =
          farmerData.confirmLandAcreage === null
            ? farmerData.landAcreage
            : farmerData.confirm_land_acreage

        farmerData.noOfCoffeeTrees =
          farmerData.confirmNoOfCoffeeTrees === null
            ? farmerData.noOfCoffeeTrees
            : farmerData.confirm_no_of_coffee_trees
      }

      // skip loop for rejected records
      if (farmerData.reviewState === ODK_REVIEW_STATUS.REJECTED) {
        continue
      }

      const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(
        farmerData.cc
      )

      let location = {}

      if (key === 'BUZAAYA') {
        location = {
          type: farmerData.farmLocation.type,
          coordinates: farmerData.farmLocation?.coordinates?.slice(0, 2) ?? null
        }
      } else if (key === 'NORTHERN_UGANDA') {
        location = axGetLocationByUUID(
          farmerData.instanceID,
          FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_ID,
          FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME
        )
      }

      const otherFarmEnterprises =
        farmerData.otherFarmEnterprises?.split(' ') ?? []

      const agroforestry =
        farmerData.agroforestry === 'Yes'
          ? AGROFORESTRY_TYPES.YES
          : AGROFORESTRY_TYPES.NO

      farmerData = {
        ...farmerData,
        ccCode,
        coCode,
        unionCode,
        location,
        isFarmerDataValidated,
        flag,
        flagReason,
        otherFarmEnterprises,
        agroforestry
      }

      const resp = await postFarmersDetail(farmerData)

      if (resp === null) {
        // skipping the duplicate record
        continue
      }

      await saveLastFetchedFarmerMember(resp._id)
    }

    return true
  } catch (error) {
    throw new Error(
      `Error while handling farmer data from ODK. Error: ${error}`
    )
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

export {
  getFarmerDetailsById,
  getFarmerDetailsBySubmissionUUID,
  getFarmersDetailAfterTimestamp,
  postFarmersDetail,
  updateBatchIdInFarmerDetails,
  updateFarmerProduceIdInFarmerDetails,
  updateFarmerCollection,
  deleteAllFarmers,
  handleFarmerDataFromODK,
  axGetFarmerMembersFromODK,
  editFarmerById
}
