import { saveLogToFile } from '../utils'
import { FarmerProduce } from '../models'

import {
  postFarmerProduceDetail,
  updateFarmerCollection,
  authorization,
  handleFarmerProduceDataFromODK,
  retrieveFarmerProduceLastFetchedTime,
  updateFarmerProduceLastFetchedTime,
  axGetFarmerProduceFromODK,
  authenticateCronJob,
  getlistData,
  getAggregations,
  getFarmerProduceDetailsById,
  getFarmerDetailsByFarmerId
} from '../services'
import { FARMER_PRODUCE_ODK_FORM_DETAILS } from '../static/constants'

import { FIELD_TYPES } from '../utils/schema'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmer Produce']
     #swagger.description = 'Endpoint to get all farmer produce data.' */
  try {
    const farmerProduceData = await getlistData(req, FarmerProduce)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/FarmerProduceList" },
       description: "List of all farmer produce data." } */
    res.status(200).json(farmerProduceData)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Farmer Produce']
       #swagger.description = 'Endpoint to get aggregated farmer produce data.' */
    try {
      const aggregationFields = {
        produceType: FIELD_TYPES.GROUPANDCOUNT,
        quantity: FIELD_TYPES.MINMAX
      }
      const aggregationData = await getAggregations(
        req,
        FarmerProduce,
        aggregationFields
      )
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/FarmerProduceAggregation" },
         description: "Aggregated farmer produce data." } */
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/fetchFarmerProduceFromODKApiCRON',
  authenticateCronJob,
  async (req, res, next) => {
    /* #swagger.tags = ['Farmer Produce']
       #swagger.description = 'Endpoint to fetch farmer produce data from ODK API (CRON job).' */
    try {
      for (const [key] of Object.entries(FARMER_PRODUCE_ODK_FORM_DETAILS)) {
        const LastFetchedTime: string | Date =
          await retrieveFarmerProduceLastFetchedTime(key)
        // initial fetch time = 2023-09-19T11:00:00.000Z

        // TODO: In future, get union name from odk form URL and save it in each farmerProduceData

        const data = await axGetFarmerProduceFromODK(
          LastFetchedTime,
          FARMER_PRODUCE_ODK_FORM_DETAILS[key].FORM_ID,
          FARMER_PRODUCE_ODK_FORM_DETAILS[key].FORM_NAME
        )

        const updatedLastFetchedTime = new Date().toISOString()

        const lengthOfData = data?.value?.length

        if (data === undefined) {
          /* #swagger.responses[500] = {
             schema: { message: "Data is undefined" },
             description: "Server error occurred while fetching data." } */
          res.status(500).json({ message: 'Data is undefined' })
        }

        if (data !== undefined && lengthOfData === 0) {
          await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // save the last fetched time in db

          const output = {
            message: 'No new data found'
          }

          // Save output to file
          saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

          return res.status(200).json(output)
        }

        if (data.value !== undefined) {
          await handleFarmerProduceDataFromODK(data, key)

          await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // save the last fetched time in db

          // FIXME : do we need activity log here?

          const output = {
            message:
              'Data fetching from odk is completed. Data is synced to server now.',
            LastFetchedTime,
            updatedLastFetchedTime,
            lengthOfData: data.value.length
          }
          saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')
          /* #swagger.responses[200] = {
             schema: { "$ref": "#/definitions/ODKFetchResponse" },
             description: "Farmer produce data fetched successfully from ODK." } */
          res.status(200).json(output)
        }
      }
    } catch (err) {
      const errorMessage = `Error in Fetching Farmer Produce From ODK. Error: ${err.message}`
      res.status(500).json({ message: errorMessage })
      saveLogToFile(errorMessage, 'fetchFarmerProduceFromODKAPI', true)
      next(err)
      throw err
    }
  }
)

router.get(
  '/fetchFarmerProduceFromODKApiOnDemand',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Farmer Produce']
       #swagger.description = 'Endpoint to fetch farmer produce data from ODK API on demand.' */
    try {
      const key = 'BUZAAYA' // TODO: get key from request
      const LastFetchedTime: any = await retrieveFarmerProduceLastFetchedTime(
        key
      )
      // initial fetch time = 2023-09-19T11:00:00.000Z

      // TODO: In future, get union name from odk form URL and save it in each farmerProduceData

      const data = await axGetFarmerProduceFromODK(
        LastFetchedTime,
        FARMER_PRODUCE_ODK_FORM_DETAILS[key].FORM_ID,
        FARMER_PRODUCE_ODK_FORM_DETAILS[key].FORM_NAME
      )

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        /* #swagger.responses[500] = {
           schema: { message: "Data is undefined" },
           description: "Server error occurred while fetching data." } */
        res.status(500).json({ message: 'Data is undefined' })
      }

      if (data !== undefined && lengthOfData === 0) {
        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // save the last fetched time in db

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        await handleFarmerProduceDataFromODK(data, key)

        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // save the last fetched time in db

        // FIXME : do we need activity log here?

        const output = {
          message:
            'Data fetching from odk is completed. Data is synced to server now.',
          LastFetchedTime,
          updatedLastFetchedTime,
          lengthOfData: data.value.length
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

        /* #swagger.responses[200] = {
           schema: { "$ref": "#/definitions/ODKFetchResponse" },
           description: "Farmer produce data fetched successfully from ODK." } */
        res.status(200).json(output)
      }
    } catch (err) {
      const errorMessage = `Error in Fetching Farmer Produce From ODK. Error: ${err.message}`
      res.status(500).json({ message: errorMessage })
      saveLogToFile(errorMessage, 'fetchFarmerProduceFromODKAPI', true)
      next(err)
      throw err
    }
  }
)

router.get(
  '/show/:farmerProduceId',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const { farmerProduceId } = req.params

      const farmerProduceArr = await getFarmerProduceDetailsById(
        farmerProduceId
      )
      if (!farmerProduceArr) {
        throw new Error('Invalid farmerProduce id found')
      }

      const farmer = await getFarmerDetailsByFarmerId(farmerProduceArr.farmerId)

      const result = {
        farmer,
        farmerProduces: farmerProduceArr
      }

      res.status(200).json(result)
    } catch (err) {
      console.error(err)
      next(err)
    }
  }
)

router.post('/new', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmer Produce']
     #swagger.description = 'Endpoint to create a new farmer produce.' */
  try {
    const { productId } = req.params // TODO: not working
    const { ...farmerData } = req.body
    const farmer = {
      product: productId,
      ...farmerData
    }
    const savedFarmer = await postFarmerProduceDetail(farmer)
    await updateFarmerCollection(farmer.farmerId, savedFarmer._id)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/FarmerProduce" },
       description: "New farmer produce created successfully." } */
    res.status(200).json(savedFarmer)
    // TODO: add activity log
  } catch (err) {
    next(err)
  }
})

module.exports = router
