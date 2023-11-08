import { FarmerProduce } from '../models'
import axios from 'axios'
import { SITE_CONFIG } from '../static/constants'
import { updateFarmerProduceIdInFarmerDetails } from '../services'
const mongoose = require('mongoose')

const getFarmerProduceDetailsById = async (farmerId: string): Promise<any> => {
  try {
    const farmer = await FarmerProduce.findById(farmerId)
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
      product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      createdAt: new Date(),
      farmerProduceId
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
const handleFarmerProduceDataFromODK = async (data: any): Promise<any> => {
  try {
    const { value } = data

    for (const farmerProduceRecord of value) {
      const {
        farmer,
        contact_no: contactNo,
        quantity,
        type_of_coffee: type,
        name_collector: collectorName,
        date_of_collection: dateOfCollection,
        no_of_bags: noOfBags,
        grn_number: grnNumber,
        grn_recipt: grnReceipt,
        farmer_id: farmerId,
        meta,
        __system,
        cc
      } = farmerProduceRecord

      const odkCollectionDate = dateOfCollection
        ? new Date(dateOfCollection)
        : null

      const metaData = {
        ...meta,
        submittedOnODK: __system?.submissionDate,
        submitterName: __system?.submitterName,
        formVersion: __system?.formVersion
      }

      const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(cc)

      const { _id: farmerProduceId } = await postFarmerProduceDetail({
        farmerId,
        farmerName: farmer,
        contactNo,
        quantity,
        type,
        collectorName,
        odkCollectionDate,
        noOfBags,
        grnNumber,
        grnReceipt,
        ccCode,
        coCode,
        unionCode,
        metaData
      })

      // update farmer member data with farmer produce records
      await updateFarmerProduceIdInFarmerDetails(farmerId, farmerProduceId)
    }

    return true
  } catch (error) {
    console.log('error', error)
    throw new Error('Error while handling farmer data from ODK')
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
  postFarmerProduceDetail,
  updateBatchIdInFarmerProduceDetails,
  handleFarmerProduceDataFromODK
}
