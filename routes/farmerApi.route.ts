import {
  checkAndFixGeometry,
  saveLogToFile,
  unionIdToUnionName,
  formatTimeStampFromUTC
} from '../utils'
import { Farmers } from '../models'
import {
  authenticateCronJob,
  authorization,
  axGetFarmerMembersFromODK,
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
  axPostActivity,
  updateFarmerMembersLastFetchedTime,
  deleteFarmerById
} from '../services'
import { ODK_FORM_DETAILS } from '../static/constants'
import { FIELD_TYPES } from '../utils/schema'
import { FARMER_MEMBER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import logger from '../utils/logger'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to get all farmers.' */
  try {
    const farmers = await getlistData(
      req,
      Farmers,
      FARMER_MEMBER_PRE_DEFINED_FIELDS,
      { farmerName: 1 }
    )
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/FarmerList" },
       description: "List of all farmers." } */
    res.status(200).json(farmers)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Farmers']
       #swagger.description = 'Endpoint to get aggregated farmer data.' */
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
        isLocationVerified: FIELD_TYPES.BOOLEAN,
        isFarmerDataValidated: FIELD_TYPES.BOOLEAN,
        yearOfFirstPlanting: FIELD_TYPES.MINMAX,
        noOfFarmPlots: FIELD_TYPES.MINMAX,
        enumerator: FIELD_TYPES.GROUPANDCOUNT
      }

      const aggregationData = await getAggregations(
        req,
        Farmers,
        aggregationFields
      )
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/FarmerAggregation" },
         description: "Aggregated farmer data." } */
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

router.post('/new', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to create a new farmer.' */
  try {
    const { productId } = req.params // FIXME: not working

    const { ...farmerData } = req.body
    const farmer = {
      product: productId,
      ...farmerData
    }

    const { id: userId } = req.locals

    const savedFarmer = await postFarmersDetail(farmer) // Saving the farmer
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Farmer" },
       description: "Created farmer." } */
    res.status(200).json(savedFarmer)

    const activity = {
      activityHolderId: savedFarmer.id,
      activityHolderType: 'FARMER',
      authorId: userId,
      activityType: 'FARMER_CREATION',
      rootHolderId: savedFarmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: savedFarmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: `Farmer: ${savedFarmer.farmerName} created`,
      isShowable: true
    }

    await axPostActivity(req, activity)

    const odkSubmissionActivity = {
      activityHolderId: savedFarmer.id,
      activityHolderType: 'FARMER',
      authorId: userId,
      activityType: 'FARMER_CREATION',
      rootHolderId: savedFarmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: savedFarmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: `Submitted on ODK by ${
        savedFarmer.submitterName
      } at ${formatTimeStampFromUTC(savedFarmer.submittedOnODK)}`,
      dateCreated: savedFarmer.submittedOnODK,
      lastUpdated: savedFarmer.submittedOnODK,
      isShowable: true
    }

    await axPostActivity(req, odkSubmissionActivity)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/fetchFarmerMemberFromODKApiCRON',
  authenticateCronJob,
  async (req, res) => {
    /* #swagger.tags = ['Farmers']
       #swagger.description = 'Endpoint to fetch farmer members from ODK API (CRON job).' */
    try {
      const results = [] // Array to hold results from each iteration
      for (const [key] of Object.entries(ODK_FORM_DETAILS)) {
        const LastFetchedTime = await retrieveFarmerMembersLastFetchedTime(key)
        const data = await axGetFarmerMembersFromODK(
          LastFetchedTime,
          ODK_FORM_DETAILS[key].FORM_ID,
          ODK_FORM_DETAILS[key].FORM_NAME
        )

        const updatedLastFetchedTime = new Date().toISOString()

        if (data === undefined) {
          results.push({ key, message: 'Data is undefined' })
          continue // Skip to the next iteration
        }

        const lengthOfData = data?.value?.length || 0

        if (lengthOfData === 0) {
          await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key)
          results.push({ key, message: 'No new data found' })
          continue // Skip to the next iteration
        }

        if (data.value !== undefined) {
          const result = await handleFarmerDataFromODK(data, key)
          await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime, key)

          const output = {
            key,
            message:
              'Data fetching from ODK is completed. Data is synced to server now.',
            LastFetchedTime,
            updatedLastFetchedTime,
            lengthOfData: data.value.length,
            success: result.success,
            processedCount: lengthOfData - result.errors.length,
            errorCount: result.errors.length
          }

          if (result.errors && result.errors.length > 0) {
            output.message += ' Some errors occurred during processing.'
            result.errors.forEach((err) => {
              saveLogToFile(err, 'fetchFarmerMemberFromODKAPI', true)
            })
          }

          results.push(output)
        }
      }

      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/FetchFarmerMemberResult" },
         description: "Results of fetching farmer members from ODK API." } */
      return res.status(200).json({ results })
    } catch (err) {
      const errorMessage = `Error in fetching farmer members from ODK using cron. error: ${err.message}`
      logger.error({
        method: req.method,
        stack: err.stack,
        message: errorMessage
      })
      saveLogToFile(errorMessage, 'fetchFarmerMemberFromODKAPI', true)
      return res.status(500).json({ message: errorMessage })
    }
  }
)

router.get(
  '/fetchFarmerMemberFromODKApiOnDemand',
  authorization('UNION'),
  async (req, res) => {
    /* #swagger.tags = ['Farmers']
       #swagger.description = 'Endpoint to fetch farmer members from ODK API (on demand).' */
    try {
      let { key } = req.query

      key = unionIdToUnionName(Number(key))

      // Check if key is provided
      if (!key || ODK_FORM_DETAILS[key] === undefined) {
        return res.status(400).json({ message: 'Key is required' })
      }

      const LastFetchedTime: string | Date =
        await retrieveFarmerMembersLastFetchedTime(key)

      const data = await axGetFarmerMembersFromODK(
        LastFetchedTime,
        ODK_FORM_DETAILS[key].FORM_ID,
        ODK_FORM_DETAILS[key].FORM_NAME
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

        if (result.errors && result.errors.length > 0) {
          output.message += ' Some errors occurred during processing.'
          result.errors.forEach((err: any) => {
            saveLogToFile(err, 'fetchFarmerMemberFromODKAPI', true)
          })
        }

        saveLogToFile(output, 'fetchFarmerMemberFromODKAPI')

        /* #swagger.responses[200] = {
           schema: { "$ref": "#/definitions/FetchFarmerMemberResult" },
           description: "Results of fetching farmer members from ODK API." } */
        return res.status(200).json(output)
      }
    } catch (err) {
      const errorMessage = `Error in fetching farmer members from ODK on demand. Error: ${err.message}`
      logger.error({
        method: req.method,
        stack: err.stack,
        message: errorMessage
      })
      saveLogToFile(errorMessage, 'fetchFarmerMemberFromODKAPI', true)
      return res.status(500).json({ message: errorMessage })
    }
  }
)

router.get('/allByUnion', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to get all farmers by union.' */
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

    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/FarmerList" },
       description: "List of farmers by union." } */
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
    /* #swagger.tags = ['Farmers']
       #swagger.description = 'Endpoint to get farmer details by ID.' */
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

      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/FarmerDetails" },
         description: "Farmer details." } */
      res.status(200).json(result)
    } catch (err) {
      console.error(err)
      next(err)
    }
  }
)

router.get('/:farmerId', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to get farmer details by ID.' */
  try {
    const { farmerId } = req.params
    const farmer = await getFarmerDetailsById(farmerId)
    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Farmer" },
       description: "Farmer details." } */
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/uuid/:farmerUUID',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Farmers']
       #swagger.description = 'Endpoint to get farmer details by UUID.' */
    try {
      const { farmerUUID } = req.params
      const farmer = await getFarmerDetailsBySubmissionUUID(farmerUUID)
      if (!farmer) {
        throw new Error('Invalid farmer id found')
      }
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/Farmer" },
         description: "Farmer details." } */
      res.status(200).json(farmer)
    } catch (err) {
      next(err)
    }
  }
)

router.put('/:farmerId', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to update farmer details.' */
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

    Object.keys(payload).forEach((key) => {
      const activity = {
        activityHolderId: farmer.id,
        activityHolderType: 'FARMER',
        authorId: req.locals.id,
        activityType: 'FARMER_UPDATE',
        rootHolderId: farmer.id,
        rootHolderType: 'content.eml.Farmer',
        subRootHolderId: farmer.id,
        subRootHolderType: 'content.eml.Farmer',
        activityDescription: `Updated ${key} from ${JSON.stringify(
          farmer[key]
        )} to ${JSON.stringify(payload[key])}`,
        isShowable: true
      }
      void axPostActivity(req, activity)
    })

    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Farmer" },
       description: "Updated farmer details." } */
    res.status(200).json({ message: 'Farmer updated' })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

router.delete('/:farmerId', authorization('union'), async (req, res, next) => {
  /* #swagger.tags = ['Farmers']
     #swagger.description = 'Endpoint to soft delete a farmer.' */
  try {
    const { farmerId } = req.params
    const { id: userId } = req.locals
    await deleteFarmerById(farmerId, userId)
    const farmer = await Farmers.findOne({ _id: farmerId })
    if (!farmer) {
      throw new Error('Invalid farmer id found')
    }
    await Farmers.findOneAndUpdate({ _id: farmerId }, { isDeleted: true })

    // Add activity of farmer deletion
    const timestamp = new Date().toISOString()
    const activity = {
      activityHolderId: farmer.id,
      activityHolderType: 'FARMER',
      authorId: userId,
      lastUpdated: timestamp,
      activityType: 'FARMER_DELETION',
      rootHolderId: farmer.id,
      rootHolderType: 'content.eml.Farmer',
      subRootHolderId: farmer.id,
      subRootHolderType: 'content.eml.Farmer',
      activityDescription: null,
      isShowable: true
    }
    await axPostActivity(req, activity)

    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/DeleteResponse" },
       description: "Farmer deleted." } */
    res.status(200).json({ success: true, message: 'Farmer deleted' })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

module.exports = router
