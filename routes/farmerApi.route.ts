import {
  checkAndFixGeometry,
  saveLogToFile,
  unionIdToUnionName
} from '../utils'
import { Farmers } from '../models'
import {
  authenticateCronJob,
  authorization,
  axGetFarmerMembersFromODK,
  deleteAllFarmers,
  getlistData,
  getAggregations,
  getActivitiesByHolderId,
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
import { FARMER_MEMBER_ODK_FORM_DETAILS } from '../static/constants'
import { FIELD_TYPES } from '../utils/schema'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  try {
    const farmers = await getlistData(req, Farmers)
    res.status(200).json(farmers)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const aggregationFields = {
        landAcreage: FIELD_TYPES.MINMAX,
        coffeeAcreage: FIELD_TYPES.MINMAX,
        noOfCoffeeTrees: FIELD_TYPES.MINMAX,
        noOfDependents: FIELD_TYPES.MINMAX,
        village: FIELD_TYPES.GROUPANDCOUNT,
        gender: FIELD_TYPES.GROUPANDCOUNT,
        levelOfEducation: FIELD_TYPES.GROUPANDCOUNT,
        otherFarmEnterprises: FIELD_TYPES.UNWINDANDGROUP,
        agroforestry: FIELD_TYPES.GROUPANDCOUNT,
        isLocationVerified: FIELD_TYPES.BOOLEAN
      }

      const aggregationData = await getAggregations(
        req,
        Farmers,
        aggregationFields
      )
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

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
      for (const [key] of Object.entries(FARMER_MEMBER_ODK_FORM_DETAILS)) {
        const LastFetchedTime: string | Date =
          await retrieveFarmerMembersLastFetchedTime(key)

        const data = await axGetFarmerMembersFromODK(
          LastFetchedTime,
          FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_ID,
          FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME
        )

        const updatedLastFetchedTime = new Date().toISOString()

        if (data === undefined) {
          return res.status(500).json({ message: 'Data is undefined' })
        }

        const lengthOfData = data?.value?.length || 0

        if (lengthOfData === 0) {
          await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key)

          const output = {
            message: 'No new data found'
          }

          // Save output to file
          saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

          return res.status(200).json(output)
        }

        if (data.value !== undefined) {
          const result = await handleFarmerDataFromODK(data, key)

          await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key) // save the last fetched time in db

          const output = {
            message:
              'Data fetching from ODK is completed. Data is synced to server now.',
            LastFetchedTime,
            updatedLastFetchedTime,
            lengthOfData: data.value.length,
            success: result.success,
            processedCount: lengthOfData - result.errors.length,
            errorCount: result.errors.length
          }

          if (result.errors.length > 0) {
            output.message += ' Some errors occurred during processing.'
            saveLogToFile(result.errors, 'fetchFarmerMemberFromODKAPI')
          }

          saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

          res.status(200).json(output)
        }
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
      let { key } = req.query

      key = unionIdToUnionName(Number(key))

      // check if key is provided
      if (!key || FARMER_MEMBER_ODK_FORM_DETAILS[key] === undefined) {
        return res.status(400).json({ message: 'Key is required' })
      }

      const LastFetchedTime: string | Date =
        await retrieveFarmerMembersLastFetchedTime(key)

      const data = await axGetFarmerMembersFromODK(
        LastFetchedTime,
        FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_ID,
        FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME
      )

      const updatedLastFetchedTime = new Date().toISOString()

      if (data === undefined) {
        return res.status(500).json({ message: 'Data is undefined' })
      }

      const lengthOfData = data?.value?.length || 0

      if (lengthOfData === 0) {
        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key)

        const output = {
          message: 'No new data found'
        }

        // Save output to file
        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        return res.status(200).json(output)
      }

      if (data.value !== undefined) {
        const result = await handleFarmerDataFromODK(data, key)

        await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key)

        const output = {
          message:
            'Data fetching from ODK is completed. Data is synced to server now.',
          LastFetchedTime,
          updatedLastFetchedTime,
          lengthOfData: data.value.length,
          success: result.success,
          processedCount: lengthOfData - result.errors.length,
          errorCount: result.errors.length
        }

        if (result.errors.length > 0) {
          output.message += ' Some errors occurred during processing.'
          saveLogToFile(result.errors, 'fetchFarmerMemberFromODKAPI')
        }

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
        location: 1,
        noOfFarmPlots: 1,
        centroid: 1
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

      const activityArr = await getActivitiesByHolderId(farmerId)

      const result = {
        farmer,
        farmerProduces: farmerProduceArr,
        batches: batchArr,
        lots: lotArr,
        activityArr
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
      return res.status(404).json({ error: 'Farmer not found' })
    }

    // update farmer
    const updateObject = {
      ...payload,
      lastUpdatedAt: new Date().toISOString()
    }

    // update location related keys: location, centroid, noOfFarmPlots
    if (payload.location) {
      const { location, centroids } = checkAndFixGeometry(payload.location)
      // update location
      updateObject.location = location
      // update centroid
      updateObject.centroid = centroids
      // update number of farm plots
      updateObject.noOfFarmPlots = payload.location.features.length
    }

    await Farmers.findByIdAndUpdate(farmerId, updateObject, {
      new: true,
      runValidators: true
    })

    // update activity log
    const timestamp = new Date().toISOString()

    Object.keys(payload).forEach((key) => {
      const activity = {
        activityHolderId: farmer._id,
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
      activityHolderId: farmer._id,
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
