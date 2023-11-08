import { SITE_CONFIG } from '../static/constants'
import { Farmers } from '../models'
import axios from 'axios'
const mongoose = require('mongoose')

const getFarmerDetailsById = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await Farmers.findById(farmerId)
    return farmer
  } catch (err) {
    throw new Error('Error while fetching farmer details')
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

const postFarmersDetail = async (farmerInfo: any): Promise<any> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('farmermembers').countDocuments()
    const farmerId = `BUZ-${(Number(count) + 1).toString().padStart(3, '0')}`
    const newFarmer = new Farmers({
      ...farmerInfo,
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date(),
      farmerId,
      farmerProduceIds: []
    })
    await newFarmer.save()
    return newFarmer
  } catch (err) {
    throw new Error(`Error while saving farmer details. Error:  ${err.message}`)
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

const axGetFarmerMembersFromODK = async (LastFetchedTime): Promise<any> => {
  try {
    const config = {
      method: 'get',
      url: `${SITE_CONFIG.ODK_FARMER_MEMBER_API}/projects/2/forms/Buzaaya-Union-Farmer-Registraion/submissions?gtDate=${LastFetchedTime}`,
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
    // TODO: add Others on production db

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
    throw new Error('Error while getting cc codes from ODK data')
  }
}

const handleFarmerDataFromODK = async (data: any): Promise<any> => {
  try {
    const { value } = data

    for (const farmerRecord of value) {
      const {
        personal_details,
        administrative_details,
        farm_details,
        meta,
        __system
      } = farmerRecord

      const personalDetails = {
        ...personal_details,
        village: administrative_details?.name_of_village,
        cc: administrative_details?.name_of_collection_centre
      }

      const farmDetails = {
        ...farm_details,
        other_farm_enterprises:
          farm_details?.other_farm_enterprises?.split(' ') ?? []
      }

      const metaData = {
        ...meta,
        submittedOnODK: __system?.submissionDate,
        submitterName: __system?.submitterName,
        formVersion: __system?.formVersion
      }

      const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(
        administrative_details.name_of_collection_centre
      )

      const location = {
        type: farmDetails.location.type,
        coordinates: farmDetails.location?.coordinates?.slice(0, 2) ?? null
      }

      const isFarmerDataValid = false // TODO: validate farmer data

      await postFarmersDetail({
        personalDetails,
        farmDetails,
        ccCode,
        coCode,
        unionCode,
        metaData,
        location,
        isFarmerDataValid
      })
    }

    return true
  } catch (error) {
    console.log('error', error)
    throw new Error('Error while handling farmer data from ODK')
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
  getFarmersDetailAfterTimestamp,
  postFarmersDetail,
  updateBatchIdInFarmerDetails,
  updateFarmerProduceIdInFarmerDetails,
  updateFarmerCollection,
  deleteAllFarmers,
  handleFarmerDataFromODK,
  axGetFarmerMembersFromODK
}
