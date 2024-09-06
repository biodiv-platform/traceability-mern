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
  authenticateCronJob
} from '../services'
import { FARMER_PRODUCE_ODK_FORM_DETAILS } from '../static/constants'

const router = require('express').Router()

// get all farmer produce details
router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    // future scope features
    // eslint-disable-next-line
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await FarmerProduce.find({
      ccCode: { $in: ccCodes.split(',').map(Number) }
    })
    res.status(200).json(BatchArr)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/fetchFarmerProduceFromODKApiCRON',
  authenticateCronJob,
  async (req, res, next) => {
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

router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    const { productId } = req.params // TODO: not working

    const { ...farmerData } = req.body
    const farmer = {
      product: productId,
      ...farmerData
    }

    const savedFarmer = await postFarmerProduceDetail(farmer)

    await updateFarmerCollection(farmer.farmerId, savedFarmer._id)

    // Saving the farmer
    res.status(200).json(savedFarmer)
    // TODO: add activity log
  } catch (err) {
    next(err)
  }
})

module.exports = router
