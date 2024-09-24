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

import {
  createFilterFromSchema,
  escapeRegex,
  createAggregations
} from '../utils/schema'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  try {
    const blockList = [
      'offset',
      'limit',
      'lastUpdatedMinDate',
      'lastUpdatedMaxDate'
    ]
    const filter: Record<string, any> = { isDeleted: false }
    const schemaFilters = createFilterFromSchema(FarmerProduce.schema.obj)

    // Loop through query parameters and apply filters
    Object.entries(req.query).forEach(([key, value]) => {
      if (blockList.includes(key)) {
        return
      }

      const stringValue = value as string

      if (schemaFilters[key]) {
        const result = schemaFilters[key](stringValue, filter)
        if (result) Object.assign(filter, result)
      } else if (stringValue.includes(',')) {
        filter[key] = { $in: stringValue.split(',').map((v) => v.trim()) }
      } else {
        filter[key] = { $regex: `^${escapeRegex(stringValue)}$`, $options: 'i' }
      }
    })

    const BatchArr = await FarmerProduce.find(filter)

    res.status(200).json(BatchArr)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const blockList = ['offset', 'lastUpdatedMinDate', 'lastUpdatedMaxDate']
      const filter: Record<string, any> = { isDeleted: false }
      const schemaFilters = createFilterFromSchema(FarmerProduce.schema.obj)

      // Loop through query parameters and apply filters
      Object.entries(req.query).forEach(([key, value]) => {
        if (blockList.includes(key)) {
          return
        }

        const stringValue = value as string

        if (schemaFilters[key]) {
          const result = schemaFilters[key](stringValue, filter)
          if (result) Object.assign(filter, result)
        }
      })

      // Aggregation config object for fields and their respective aggregations
      const aggregationFields = {
        produceType: 'groupAndCount',
        quantity: 'minMax'
      }

      const { aggregation, additionalAggregations } = createAggregations(
        aggregationFields,
        filter
      )

      // Execute aggregations in parallel
      const results = await Promise.all([
        FarmerProduce.aggregate(aggregation),
        ...Object.values(additionalAggregations).map((pipeline) =>
          FarmerProduce.aggregate(pipeline)
        )
      ])

      // Format the grouped results
      const formattedData = Object.keys(additionalAggregations).reduce(
        (acc, field, index) => {
          acc[field] = results[index + 1].reduce((formattedAcc, item) => {
            formattedAcc[item[field]] = item.count
            return formattedAcc
          }, {})
          return acc
        },
        {}
      )

      // Combine all aggregates into one response object
      const aggregationData = { ...results[0][0], ...formattedData }

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
    try {
      const LastFetchedTime: any = await retrieveFarmerProduceLastFetchedTime()
      // initial fetch time = 2023-09-19T11:00:00.000Z

      // TODO: In future, get union name from odk form URL and save it in each farmerProduceData

      const data = await axGetFarmerProduceFromODK(LastFetchedTime)

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        res.status(500).json({ message: 'Data is undefined' })
      }

      if (data !== undefined && lengthOfData === 0) {
        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        await handleFarmerProduceDataFromODK(data)

        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

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
      const LastFetchedTime: any = await retrieveFarmerProduceLastFetchedTime()
      // initial fetch time = 2023-09-19T11:00:00.000Z

      // TODO: In future, get union name from odk form URL and save it in each farmerProduceData

      const data = await axGetFarmerProduceFromODK(LastFetchedTime)

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        res.status(500).json({ message: 'Data is undefined' })
      }

      if (data !== undefined && lengthOfData === 0) {
        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerProduceFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        await handleFarmerProduceDataFromODK(data)

        await updateFarmerProduceLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

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
