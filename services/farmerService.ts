import { SITE_CONFIG, ODK_REVIEW_STATUS } from '../static/constants'
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
      createdAt: new Date().toISOString(),
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

const handleFarmerDataFromODK = async (data: any): Promise<any> => {
  try {
    const { value } = data

    for (const farmerRecord of value) {
      const {
        personal_details: {
          farmer_name: farmerName,
          gender,
          date_of_birth: dateOfBirth,
          format_date: formatDate,
          contact_number: contactNumber,
          national_identity_number: nationalIdentityNumber,
          level_of_education: levelOfEducation,
          no_of_dependents: noOfDependents
        },
        administrative_details: {
          name_of_village: village,
          name_of_collection_centre: cc
        },
        farm_details: {
          land_acreage: landAcreage,
          coffee_acrage: coffeeAcreage,
          no_of_coffee_trees: noOfCoffeeTrees,
          other_farm_enterprises: otherFarmEnterprises,
          agroforestry,
          location: farmLocation,
          photo_of_farm: photoOfFarm
        },
        meta: { instanceID, instanceName, entity },
        __system: {
          submissionDate: submittedOnODK,
          submitterName,
          formVersion,
          reviewState,
          edits
        }
      } = farmerRecord

      // skip loop for rejected records
      if (reviewState === ODK_REVIEW_STATUS.REJECTED) {
        continue
      }

      const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(cc)

      const location = {
        type: farmLocation.type,
        coordinates: farmLocation?.coordinates?.slice(0, 2) ?? null
      }

      /*
      Future Case: validate farmer data
      */
      const isFarmerDataValidated = false

      await postFarmersDetail({
        farmerName,
        gender,
        dateOfBirth,
        formatDate,
        contactNumber,
        nationalIdentityNumber,
        levelOfEducation,
        noOfDependents,
        village,
        cc,
        landAcreage,
        coffeeAcreage,
        noOfCoffeeTrees,
        otherFarmEnterprises: otherFarmEnterprises?.split(' ') ?? [],
        agroforestry: agroforestry === 'Yes' ? 'Yes' : 'No',
        farmLocation,
        photoOfFarm,
        ccCode,
        coCode,
        unionCode,
        instanceID,
        instanceName,
        entity,
        submittedOnODK,
        submitterName,
        formVersion,
        reviewState,
        edits,
        location,
        isFarmerDataValidated
      })
    }

    return true
  } catch (error) {
    console.log('error', error)
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
