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

router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  // TODO: check if user is from particular union or not, for two way authorization
  try {
    // future scope features
    // eslint-disable-next-line
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await Farmers.find({
      ccCode: { $in: ccCodes.split(',').map(Number) },
      isDeleted: false
    })
    res.status(200).json(BatchArr)
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
