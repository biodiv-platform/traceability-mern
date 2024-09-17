import { saveLogToFile } from '../utils'
import { Farmers } from '../models'
import {
  authenticateCronJob,
  authorization,
  axGetFarmerMembersFromODK,
  deleteAllFarmers,
  getBatch,
  getFarmerDetailsById,
  getFarmerDetailsBySubmissionUUID,
  getFarmerProduceDetailsByFarmerId,
  getLot,
  handleFarmerDataFromODK,
  postFarmersDetail,
  retrieveFarmerMembersLastFetchedTime,
  saveActivity,
  updateFarmerMembersLastFetchedTime
} from '../services'
import {
  createFilterFromSchema,
  escapeRegex,
  capitalizeFiledNames
} from '../utils/schema'

const router = require('express').Router()

interface FarmerFilter {
  isDeleted?: boolean
  farmerId?: any
  farmerName?: any
  village?: any
  ccCode?: any
  landAcreage?: any
  coffeeAcreage?: any
  noOfCoffeeTrees?: any
  lastUpdatedAt?: any
  gender?: any
}

router.get('/all', authorization('UNION'), async (req, res, next) => {
  try {
    const blockList = ['offset', 'lastUpdatedMinDate', 'lastUpdatedMaxDate']
    const filter: Record<string, any> = { isDeleted: false }
    const schemaFilters = createFilterFromSchema(Farmers.schema.obj)

    // Extract date filters
    const lastUpdatedMinDate = req.query.lastUpdatedMinDate as string
    const lastUpdatedMaxDate = req.query.lastUpdatedMaxDate as string

    // Handle date range for lastUpdatedAt using lastUpdatedMinDate and lastUpdatedMaxDate
    if (lastUpdatedMinDate || lastUpdatedMaxDate) {
      filter.lastUpdatedAt = {
        ...(lastUpdatedMinDate ? { $gte: new Date(lastUpdatedMinDate) } : {}),
        ...(lastUpdatedMaxDate ? { $lte: new Date(lastUpdatedMaxDate) } : {})
      }
    }

    const submittedOnODKMinDate = req.query.submittedOnODKMinDate as string
    const submittedOnODKMaxDate = req.query.submittedOnODKMaxDate as string

    // Handle date range for lastUpdatedAt using lastUpdatedMinDate and lastUpdatedMaxDate
    if (submittedOnODKMinDate || submittedOnODKMaxDate) {
      filter.submittedOnODK = {
        ...(submittedOnODKMinDate
          ? { $gte: new Date(submittedOnODKMinDate) }
          : {}),
        ...(submittedOnODKMaxDate
          ? { $lte: new Date(submittedOnODKMaxDate) }
          : {})
      }
    }

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

    const BatchArr = await Farmers.find(filter)

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
      const filter: FarmerFilter = { isDeleted: false }

      const { ccCodes } = req.query
      if (ccCodes) {
        const ccCode = ccCodes
          .split(',')
          .map((code) => parseInt(code.trim(), 10))
        filter.ccCode = { $in: ccCode }
      }

      // Aggregation config object for fields and their respective aggregations
      const aggregationFields = {
        landAcreage: 'minMax',
        coffeeAcreage: 'minMax',
        noOfCoffeeTrees: 'minMax',
        noOfDependents: 'minMax',
        village: 'groupAndCount',
        gender: 'groupAndCount',
        levelOfEducation: 'groupAndCount',
        otherFarmEnterprises: 'unwindAndGroup',
        agroforestry: 'groupAndCount'
      }

      const groupStage = {
        _id: null,
        totalCount: { $sum: 1 }
      }

      const projectStage = {
        _id: 0,
        totalCount: 1
      }

      Object.entries(aggregationFields).forEach(([field, type]) => {
        const capitalizedField = capitalizeFiledNames(field)
        if (type === 'minMax') {
          groupStage[`min${capitalizedField}`] = { $min: `$${field}` }
          groupStage[`max${capitalizedField}`] = { $max: `$${field}` }

          projectStage[field] = {
            min: `$min${capitalizedField}`,
            max: `$max${capitalizedField}`
          }
        }
      })

      // Aggregation pipeline for min/max fields
      const aggregation = [
        { $match: filter },
        { $group: groupStage },
        { $project: projectStage }
      ]

      // Generate additional aggregation pipelines dynamically
      const additionalAggregations = Object.entries(aggregationFields).reduce(
        (acc, [field, type]) => {
          if (type === 'groupAndCount') {
            acc[field] = [
              { $match: filter },
              { $group: { _id: `$${field}`, count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, [field]: '$_id', count: 1 } }
            ]
          } else if (type === 'unwindAndGroup') {
            acc[field] = [
              { $match: filter },
              { $unwind: `$${field}` },
              { $group: { _id: `$${field}`, count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, [field]: '$_id', count: 1 } }
            ]
          }
          return acc
        },
        {}
      )

      // Execute aggregations in parallel
      const results = await Promise.all([
        Farmers.aggregate(aggregation),
        ...Object.values(additionalAggregations).map((pipeline) =>
          Farmers.aggregate(pipeline)
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

router.get('/autocomplete', async (req, res, next) => {
  try {
    const { name, ccCodes } = req.query

    const filter: FarmerFilter = { isDeleted: false }

    if (ccCodes) {
      const ccCode = ccCodes.split(',').map((code) => parseInt(code.trim(), 10))
      filter.ccCode = { $in: ccCode }
    }

    if (name) {
      filter.farmerName = { $regex: `^${name}`, $options: 'i' } // Matches names that start with the provided string
    }

    // Query the database with the filter, returning specific fields
    const results = await Farmers.find(filter, {
      _id: 0,
      farmerId: 1,
      farmerName: 1
    }).limit(10) // Limit to 10 results for performance

    // Format the results as value-label pairs
    const formattedResults = results.map((farmer) => ({
      value: farmer.farmerId,
      label: farmer.farmerName
    }))

    res.status(200).json(formattedResults)
  } catch (err) {
    next(err)
  }
})

router.get('/document/autocomplete', async (req, res, next) => {
  try {
    const { value, ccCodes, key } = req.query

    if (!key) {
      return res.status(400).json({ error: 'The "key" parameter is required.' })
    }

    const filter: FarmerFilter = { isDeleted: false }

    if (ccCodes) {
      const ccCode = ccCodes.split(',').map((code) => parseInt(code.trim(), 10))
      filter.ccCode = { $in: ccCode }
    }

    if (value) {
      filter[key] = { $regex: `^${value}`, $options: 'i' }
    }

    // Query the database with the filter, returning specific fields
    const results = await Farmers.find(filter, {
      _id: 0,
      farmerId: 1,
      [key]: 1
    }).limit(10) // Limit to 10 results for performance

    // Format the results as value-label pairs
    const formattedResults = results.map((item) => ({
      value: item.farmerId,
      label: item[key]
    }))

    res.status(200).json(formattedResults)
  } catch (err) {
    next(err)
  }
})

// post new farmer

router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    const { productId } = req.params // FIXME: not working

    const { ...farmerData } = req.body
    const farmer = {
      product: productId,
      ...farmerData
    }

    const savedFarmer = await postFarmersDetail(farmer) // Saving the farmer
    res.status(200).json(savedFarmer)

    // TODO: add activity log
  } catch (err) {
    next(err)
  }
})

router.get(
  '/fetchFarmerMemberFromODKApiCRON',
  authenticateCronJob,
  async (req, res, next) => {
    try {
      const LastFetchedTime: any = await retrieveFarmerMembersLastFetchedTime()
      // initial fetch time = 2023-08-19T11:00:00.000Z

      const data = await axGetFarmerMembersFromODK(LastFetchedTime)

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        res.status(500).json({ message: 'Data is undefined' })
      }

      if (data !== undefined && lengthOfData === 0) {
        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        await handleFarmerDataFromODK(data)

        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message:
            'Data fetching from odk is completed. Data is synced to server now.',
          LastFetchedTime,
          updatedLastFetchedTime,
          lengthOfData: data.value.length
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        res.status(200).json(output)
      }
    } catch (err) {
      const errorMessage = `Error in Fetching Farmer Members From ODK. Error: ${err.message}`
      res.status(500).json({ message: errorMessage })
      saveLogToFile(errorMessage, 'fetchFarmerMemberFromODKAPI', true)
      next(err)
      throw err
    }
  }
)

router.get(
  '/fetchFarmerMemberFromODKApiOnDemand',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const LastFetchedTime: any = await retrieveFarmerMembersLastFetchedTime()
      // initial fetch time = 2023-08-19T11:00:00.000Z

      const data = await axGetFarmerMembersFromODK(LastFetchedTime)

      const updatedLastFetchedTime = new Date().toISOString()

      const lengthOfData = data?.value?.length

      if (data === undefined) {
        res.status(500).json({ message: 'Data is undefined' })
      }

      if (data !== undefined && lengthOfData === 0) {
        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        await handleFarmerDataFromODK(data)

        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

        const output = {
          message:
            'Data fetching from odk is completed. Data is synced to server now.',
          LastFetchedTime,
          updatedLastFetchedTime,
          lengthOfData: data.value.length
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        res.status(200).json(output)
      }
    } catch (err) {
      const errorMessage = `Error in Fetching Farmer Members From ODK. Error: ${err.message}`
      res.status(500).json({ message: errorMessage })
      saveLogToFile(errorMessage, 'fetchFarmerMemberFromODKAPI', true)
      next(err)
      throw err
    }
  }
)

router.get('/allByUnion', authorization('UNION'), async (req, res, next) => {
  try {
    const { unionCode } = req.query
    const farmers = await Farmers.find(
      {
        unionCode: Number(unionCode),
        isDeleted: false
      },
      {
        farmerId: 1,
        farmerName: 1,
        cc: 1,
        location: 1
      }
    )

    res.status(200).json(farmers)
  } catch (err) {
    console.error(err)
    next(err)
  }
})

router.get(
  '/show/:farmerId',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const { farmerId } = req.params

      const farmer = await getFarmerDetailsById(farmerId)
      if (!farmer) {
        throw new Error('Invalid farmer id found')
      }

      const farmerProduceArr = await getFarmerProduceDetailsByFarmerId(
        farmer.farmerId
      )

      const batchPromises = farmerProduceArr.map(async (produce) => {
        if (produce?.batchIdMongo) {
          const batchObj = await getBatch(produce.batchIdMongo)
          if (Object.keys(batchObj).length > 0) {
            const lotObj = await getLot(batchObj.lotIdMongo) // Assuming getLot is synchronous. If it's async, you'll need to await it.
            if (lotObj !== null) {
              return { batchObj, lotObj }
            }
            return { batchObj }
          }
        }
        return null
      })

      const results = await Promise.all(batchPromises)
      const batchArr = results
        .filter((result) => result?.batchObj)
        .map((result) => result.batchObj)
      const lotArr = results
        .filter((result) => result?.lotObj)
        .map((result) => result.lotObj)

      const result = {
        farmer,
        farmerProduces: farmerProduceArr,
        batches: batchArr,
        lots: lotArr
      }

      res.status(200).json(result)
    } catch (err) {
      console.error(err)
      next(err)
    }
  }
)

router.get('/:farmerId', authorization('UNION'), async (req, res, next) => {
  try {
    const { farmerId } = req.params
    const farmer = await getFarmerDetailsById(farmerId)
    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/uuid/:farmerUUID',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const { farmerUUID } = req.params
      const farmer = await getFarmerDetailsBySubmissionUUID(farmerUUID)
      if (!farmer) {
        throw new Error('Invalid farmer id found')
      }
      res.status(200).json(farmer)
    } catch (err) {
      next(err)
    }
  }
)

router.put('/:farmerId', authorization('UNION'), async (req, res, next) => {
  try {
    const { farmerId } = req.params

    const payload = req.body

    const farmer = await Farmers.findById(farmerId)

    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }

    // update farmer
    await Farmers.findByIdAndUpdate(
      farmerId,
      { ...payload, lastUpdatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    )

    // update activity log
    const timestamp = new Date().toISOString()

    Object.keys(payload).forEach((key) => {
      const activity = {
        activityHolderId: farmerId,
        activityHolderType: 'FARMER',
        authorId: req.locals.id,
        dateCreated: timestamp,
        activityType: 'FARMER_UPDATE',
        activityDescription: `Updated ${key} from ${JSON.stringify(
          farmer[key]
        )} to ${JSON.stringify(payload[key])}`
      }
      void saveActivity(activity)
    })

    res.status(200).json({ message: 'Farmer updated' })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

router.delete('/deleteAll', authorization('ADMIN'), async (req, res, next) => {
  try {
    await deleteAllFarmers()
    res.status(200).json({ message: 'All farmers deleted' })

    // TODO: add activity log
  } catch (err) {
    next(err)
  }
})

router.delete('/:farmerId', authorization('union'), async (req, res, next) => {
  try {
    const { farmerId } = req.params
    const { id: userId } = req.locals
    const farmer = await Farmers.findOne({ _id: farmerId })
    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }
    await Farmers.findOneAndUpdate({ _id: farmerId }, { isDeleted: true })

    // Add activity of farmer deletion
    const timestamp = new Date().toISOString()
    const activity = {
      activityHolderId: farmerId,
      activityHolderType: 'FARMER',
      authorId: userId,
      dateCreated: timestamp,
      activityType: 'FARMER_DELETION',
      activityDescription: null
    }
    await saveActivity(activity)

    res.status(200).json({ success: true, message: 'Farmer deleted' })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

module.exports = router
