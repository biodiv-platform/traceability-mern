import axios from 'axios'
import {
  ODK_FORM_DETAILS,
  ODK_REVIEW_STATUS,
  AGROFORESTRY_TYPES,
  SITE_CONFIG
} from '../static/constants'
import {
  deconstructObject,
  checkAndFixGeometry,
  convertToFeatureCollection
} from '../utils/common'
import {
  BUZAAYA_SCHEMA,
  NORTHERN_UGANDA_SCHEMA,
  BUZAAYA_KEYMAP,
  NORTHERN_UGANDA_KEYMAP
} from '../schema'
import { postFarmersDetail } from './farmerService'
import mongoose from 'mongoose'

// Map schema and keymap objects
const SCHEMAS = {
  BUZAAYA_SCHEMA,
  NORTHERN_UGANDA_SCHEMA
}

const KEYMAPS = {
  BUZAAYA_KEYMAP,
  NORTHERN_UGANDA_KEYMAP
}

const db = mongoose.connection

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

export interface ODKData {
  value: any[]
  [key: string]: any
}

export const axGetFarmerMembersFromODK = async (
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

export const handleFarmerDataFromODK = async (
  req: any = {},
  data: any,
  key: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = []
  const formConfig = ODK_FORM_DETAILS[key]

  try {
    if (!formConfig) {
      throw new Error(`Invalid form key: ${key}`)
    }

    const SCHEMA = SCHEMAS[formConfig.SCHEMA]
    const KEYMAP = KEYMAPS[formConfig.KEYMAP]

    if (!data.value || !Array.isArray(data.value)) {
      throw new Error('Invalid data format: data.value must be an array')
    }

    const { value } = data

    for (let i = 0; i < value.length; i++) {
      try {
        const farmerRecord = value[i]
        let farmerData = deconstructObject(farmerRecord, SCHEMA, KEYMAP)

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
            formConfig.FORM_ID,
            formConfig.FORM_NAME
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
        const farmerId = `${unionName}-${(initialCount + 1)
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
          id: countIds + 1,
          product: SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
          createdAt: new Date().toISOString(),
          farmerProduceIds: []
        }

        await postFarmersDetail(req, farmerData)
      } catch (error) {
        const errorMessage = `Error processing farmer with instanceID: ${
          value[i]?.meta?.instanceID || 'unknown'
        }. Error: ${error.message}`
        console.error(errorMessage)
        errors.push(errorMessage)
      }
    }

    return { success: true, errors }
  } catch (error) {
    console.error(`Error in handleFarmerDataFromODK: ${error.message}`)
    errors.push(`General error in handleFarmerDataFromODK: ${error.message}`)
    return { success: false, errors }
  }
}
