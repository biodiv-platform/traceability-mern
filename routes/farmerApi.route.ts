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

// Define known filters with specific handling logic
const knownFilters: Record<string, (value: string, filter?: any) => any> = {
  ccCodes: (value) => ({ ccCode: parseInt(value, 10) }),
  lastUpdatedMinDate: (value, filter) => {
    filter.lastUpdatedAt = {
      ...(filter.lastUpdatedAt || {}),
      $gte: new Date(value)
    }
  },
  lastUpdatedMaxDate: (value, filter) => {
    filter.lastUpdatedAt = {
      ...(filter.lastUpdatedAt || {}),
      $lte: new Date(value)
    }
  },
  submittedOnODKMinDate: (value, filter) => {
    filter.submittedOnODK = {
      ...(filter.submittedOnODK || {}),
      $gte: new Date(value)
    }
  },
  submittedOnODKMaxDate: (value, filter) => {
    filter.submittedOnODK = {
      ...(filter.submittedOnODK || {}),
      $lte: new Date(value)
    }
  },
  landAcreage: (value) => {
    const [minLand, maxLand] = value.split('-').map(Number)
    return {
      landAcreage: { $gte: minLand || 0, $lte: maxLand || Infinity }
    }
  },
  coffeeAcreage: (value) => {
    const [minCoffee, maxCoffee] = value.split('-').map(Number)
    return {
      coffeeAcreage: { $gte: minCoffee || 0, $lte: maxCoffee || Infinity }
    }
  },
  noOfCoffeeTrees: (value) => {
    const [minTrees, maxTrees] = value.split('-').map(Number)
    return {
      noOfCoffeeTrees: { $gte: minTrees || 0, $lte: maxTrees || Infinity }
    }
  },
  noOfDependents: (value) => {
    const [minNoDependents, maxNoDependents] = value.split('-').map(Number)
    return {
      noOfDependents: {
        $gte: minNoDependents || 0,
        $lte: maxNoDependents || Infinity
      }
    }
  },
  otherFarmEnterprises: (value) => {
    const enterprises = value.split(',').map((v) => v.trim())
    return { otherFarmEnterprises: { $in: enterprises } }
  }
}

router.get('/all', authorization('UNION'), async (req, res, next) => {
  try {
    // Define a block list of query parameters to skip
    const blockList = ['offset', 'skipParam2']

    // Initialize the filter with a base condition
    const filter: Record<string, any> = { isDeleted: false }

    // Utility function to escape special regex characters
    function escapeRegex (value: string): string {
      return value.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
    }

    // Loop through query parameters and apply filters
    Object.entries(req.query).forEach(([key, value]) => {
      if (blockList.includes(key)) {
        return
      }

      const stringValue = value as string // Type-cast value to string

      if (knownFilters[key]) {
        // Apply known filter logic
        const result = knownFilters[key](stringValue, filter)
        if (result) Object.assign(filter, result) // Merge the result into the main filter
      } else if (stringValue.includes(',')) {
        // Handle array-like behavior for comma-separated values
        filter[key] = { $in: stringValue.split(',').map((v) => v.trim()) }
      } else {
        // Default handling: Apply exact match regex search for string values
        filter[key] = { $regex: `^${escapeRegex(stringValue)}$`, $options: 'i' }
      }
    })

    // Query the database with filters
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
      // Extract query parameters
      const {
        user,
        village,
        ccCodes,
        landAcreage,
        coffeeAcreage,
        noOfCoffeeTrees,
        lastUpdatedMinDate,
        lastUpdatedMaxDate
      } = req.query

      // Build the filter object
      const filter: FarmerFilter = { isDeleted: false }

      // Handle user with exact match for multiple IDs
      if (user) {
        const userIds = user.split(',').map((id) => id.trim())
        filter.farmerId = { $in: userIds }
      }

      if (village) filter.village = { $regex: village, $options: 'i' }

      // Handle ccCode as an array if multiple codes are provided
      if (ccCodes) {
        const ccCode = ccCodes
          .split(',')
          .map((code) => parseInt(code.trim(), 10))
        filter.ccCode = { $in: ccCode }
      }

      // Handle range queries for landAcreage and noOfCoffeeTrees
      if (landAcreage) {
        const [minLand, maxLand] = landAcreage.split('-').map(Number)
        filter.landAcreage = { $gte: minLand || 0, $lte: maxLand || Infinity }
      }

      if (coffeeAcreage) {
        const [minCoffee, maxCoffee] = coffeeAcreage.split('-').map(Number)
        filter.coffeeAcreage = {
          $gte: minCoffee || 0,
          $lte: maxCoffee || Infinity
        }
      }

      if (noOfCoffeeTrees) {
        const [minTrees, maxTrees] = noOfCoffeeTrees.split('-').map(Number)
        filter.noOfCoffeeTrees = {
          $gte: minTrees || 0,
          $lte: maxTrees || Infinity
        }
      }

      // Handle date range for lastUpdatedAt using lastUpdatedMinDate and lastUpdatedMaxDate
      if (lastUpdatedMinDate || lastUpdatedMaxDate) {
        filter.lastUpdatedAt = {
          ...(lastUpdatedMinDate ? { $gte: new Date(lastUpdatedMinDate) } : {}),
          ...(lastUpdatedMaxDate ? { $lte: new Date(lastUpdatedMaxDate) } : {})
        }
      }

      // Main aggregation pipeline for overall counts and ranges
      const aggregation = [
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            minLandAcreage: { $min: '$landAcreage' },
            maxLandAcreage: { $max: '$landAcreage' },
            minCoffeeAcreage: { $min: '$coffeeAcreage' },
            maxCoffeeAcreage: { $max: '$coffeeAcreage' },
            minNoCoffeeTrees: { $min: '$noOfCoffeeTrees' },
            maxNoCoffeeTrees: { $max: '$noOfCoffeeTrees' },
            minNoDependents: { $min: '$noOfDependents' },
            maxNoDependents: { $max: '$noOfDependents' }
          }
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            landAcreage: {
              min: '$minLandAcreage',
              max: '$maxLandAcreage'
            },
            coffeeAcreage: {
              min: '$minCoffeeAcreage',
              max: '$maxCoffeeAcreage'
            },
            noOfCoffeeTrees: {
              min: '$minNoCoffeeTrees',
              max: '$maxNoCoffeeTrees'
            },
            noOfDependents: {
              min: '$minNoDependents',
              max: '$maxNoDependents'
            }
          }
        }
      ]

      // Aggregation pipeline for village counts
      const villageAggregation = [
        { $match: filter },
        {
          $group: {
            _id: '$village',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            village: '$_id',
            count: 1
          }
        },
        {
          $sort: { village: 1 }
        }
      ]

      // Aggregation pipeline for gender distribution
      const genderAggregation = [
        { $match: filter },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            gender: '$_id',
            count: 1
          }
        }
      ]

      // Aggregation pipeline for levelOfEducation distribution
      const educationAggregation = [
        { $match: filter },
        {
          $group: {
            _id: '$levelOfEducation',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            levelOfEducation: '$_id',
            count: 1
          }
        }
      ]

      // Aggregation pipeline for otherFarmEnterprises distribution
      const enterprisesAggregation = [
        { $match: filter },
        { $unwind: '$otherFarmEnterprises' },
        {
          $group: {
            _id: '$otherFarmEnterprises',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            otherFarmEnterprise: '$_id',
            count: 1
          }
        },
        {
          $sort: { otherFarmEnterprise: 1 }
        }
      ]

      // Aggregation pipeline for agroforestry distribution
      const agroforestryAggregation = [
        { $match: filter },
        {
          $group: {
            _id: '$agroforestry',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            agroforestry: '$_id',
            count: 1
          }
        }
      ]

      // Execute all aggregations in parallel
      const [
        aggregates,
        villageCounts,
        genderCounts,
        educationCounts,
        enterprisesCounts,
        agroforestryCounts
      ] = await Promise.all([
        Farmers.aggregate(aggregation),
        Farmers.aggregate(villageAggregation),
        Farmers.aggregate(genderAggregation),
        Farmers.aggregate(educationAggregation),
        Farmers.aggregate(enterprisesAggregation),
        Farmers.aggregate(agroforestryAggregation)
      ])

      // Format counts
      const formattedVillageCounts = villageCounts.reduce((acc, item) => {
        acc[item.village] = item.count
        return acc
      }, {})

      const formattedGenderCounts = genderCounts.reduce((acc, item) => {
        acc[item.gender] = item.count
        return acc
      }, {})

      const formattedEducationCounts = educationCounts.reduce((acc, item) => {
        acc[item.levelOfEducation] = item.count
        return acc
      }, {})

      const formattedEnterprisesCounts = enterprisesCounts.reduce(
        (acc, item) => {
          acc[item.otherFarmEnterprise] = item.count
          return acc
        },
        {}
      )

      const formattedAgroforestryCounts = agroforestryCounts.reduce(
        (acc, item) => {
          acc[item.agroforestry] = item.count
          return acc
        },
        {}
      )

      // Combine all aggregates into aggregationData
      const aggregationData = {
        ...aggregates[0],
        villageCounts: formattedVillageCounts,
        genderCounts: formattedGenderCounts,
        educationCounts: formattedEducationCounts,
        enterprisesCounts: formattedEnterprisesCounts,
        agroforestryCounts: formattedAgroforestryCounts
      }

      // Return the results
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
