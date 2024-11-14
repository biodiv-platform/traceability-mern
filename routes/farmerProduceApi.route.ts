import { saveLogToFile, unionIdToUnionName } from '../utils'
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
import { ODK_FORM_DETAILS } from '../static/constants'

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
      const results = [] // Array to hold results from each iteration

      for (const [key] of Object.entries(ODK_FORM_DETAILS)) {
        const LastFetchedTime = await retrieveFarmerProduceLastFetchedTime(key)

        if (
          ODK_FORM_DETAILS[key].FP_FORM_ID === null ||
          ODK_FORM_DETAILS[key].FP_FORM_NAME === null
        ) {
          const output = { key, message: 'Form ID or Form Name Doesnt exist' }
          results.push(output)
          continue
        }

        const data = await axGetFarmerProduceFromODK(
          LastFetchedTime,
          ODK_FORM_DETAILS[key].FP_FORM_ID,
          ODK_FORM_DETAILS[key].FP_FORM_NAME
        )

        const updatedLastFetchedTime = new Date().toISOString()

        if (data === undefined) {
          const output = { key, message: 'Data is undefined' }
          results.push(output)
          continue // Skip to the next iteration
        }

        const lengthOfData = data?.value?.length || 0

        if (lengthOfData === 0) {
          await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // Save the last fetched time in db
          const output = { key, message: 'No new data found' }
          results.push(output)
          continue // Skip to the next iteration
        }

        if (data.value !== undefined) {
          await handleFarmerProduceDataFromODK(data, key)
          await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime, key) // Save the last fetched time in db

          const output = {
            key,
            message:
              'Data fetching from ODK is completed. Data is synced to server now.',
            LastFetchedTime,
            updatedLastFetchedTime,
            lengthOfData: data.value.length
          }

          results.push(output) // Collect output with key
        }
      }

      // After the loop, send a single response
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/ODKFetchResponse" },
         description: "Farmer produce data fetched successfully from ODK." } */
      res.status(200).json({ results })
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
      let { key } = req.query

      key = unionIdToUnionName(Number(key))

      // check if key is provided
      if (!key || ODK_FORM_DETAILS[key] === undefined) {
        return res.status(400).json({ message: 'Key is required' })
      }
      const LastFetchedTime: any = await retrieveFarmerProduceLastFetchedTime(
        key
      )
      // initial fetch time = 2023-09-19T11:00:00.000Z

      // TODO: In future, get union name from odk form URL and save it in each farmerProduceData

      const data = await axGetFarmerProduceFromODK(
        LastFetchedTime,
        ODK_FORM_DETAILS[key].FP_FORM_ID,
        ODK_FORM_DETAILS[key].FP_FORM_NAME
      )

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        /* #swagger.responses[500] = {
           schema: { message: "Data is undefined" },
           description: "Server error occurred while fetching data." } */
        return res.status(500).json({ message: 'Data is undefined' })
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
        return res.status(200).json(output)
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
