import { FarmerProduce } from '../models'
import axios from 'axios'
import { ENTITIES_API, ROBUSTA_COFFEE_PRODUCT_ID } from '../static/constants'
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
      product: ROBUSTA_COFFEE_PRODUCT_ID,
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
      url: `${ENTITIES_API}cc/name/${ccString}`,
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

    for (let i = 0; i < value.length; i++) {
      const farmerProduceRecord = value[i]

      const farmerName = farmerProduceRecord.farmer
      const contactNo = farmerProduceRecord.contact_no
      const quantity = farmerProduceRecord.quantity
      const type = farmerProduceRecord.type_of_coffee
      const collectorName = farmerProduceRecord.name_collector
      const noOfBags = farmerProduceRecord.no_of_bags
      const grnNumber = farmerProduceRecord.grn_number
      const grnReceipt = farmerProduceRecord.grn_recipt

      const farmerId = farmerProduceRecord.farmer_id // FIXME: temp solution permanent fix required based on cross search

      const metaData = {
        ...farmerProduceRecord.meta,
        submittedOnODK: farmerProduceRecord.__system?.submissionDate,
        submitterName: farmerProduceRecord.__system?.submitterName,
        formVersion: farmerProduceRecord.__system?.formVersion
      }

      const { ccCode, coCode, unionCode } = await axGetCodesFromODKData(
        farmerProduceRecord.cc
      )

      await postFarmerProduceDetail({
        farmerId,
        farmerName,
        contactNo,
        quantity,
        type,
        collectorName,
        noOfBags,
        grnNumber,
        grnReceipt,
        ccCode,
        coCode,
        unionCode,
        metaData
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
