import { Farmers } from '../models'
import {
  postFarmersDetail,
  authorization,
  retrieveFarmerMembersLastFetchedTime,
  updateFarmerMembersLastFetchedTime,
  handleFarmerDataFromODK,
  axGetFarmerMembersFromODK,
  deleteAllFarmers,
  getFarmerDetailsById,
  getFarmerProduceDetailsById,
  getBatch,
  getLot
} from '../services'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    // future scope features
    // eslint-disable-next-line
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await Farmers.find({
      ccCode: { $in: ccCodes.split(',').map(Number) }
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
  } catch (err) {
    next(err)
  }
})

router.get('/fetchFarmerMemberFromODKAPI', async (req, res, next) => {
  try {
    const LastFetchedTime: any = await retrieveFarmerMembersLastFetchedTime()
    // const LastFetchedTime: any = '2023-08-19T11:00:00.000Z' //initial fetch time

    const data = await axGetFarmerMembersFromODK(LastFetchedTime)

    const updatedLastFetchedTime = new Date().toISOString()

    await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) // save the last fetched time in db

    const lengthOfData = data.value.length

    if (lengthOfData === 0) {
      return res.status(200).json({
        message: 'No new data found'
      })
    }

    await handleFarmerDataFromODK(data)

    res.status(200).json({
      message:
        'Data fetching from odk is completed. Data is synced to server now.',
      LastFetchedTime,
      updatedLastFetchedTime,
      lengthOfData: data.value.length
    })
  } catch (err) {
    res.status(500).json({
      message: `Error in Fetching Farmer Members From ODK. Error: ${err.message}`
    })
    next(err)
    throw err
  }
})

router.get('/allByUnion', authorization('UNION'), async (req, res, next) => {
  try {
    const { unionCode } = req.query
    const farmers = await Farmers.find(
      { unionCode: Number(unionCode) },
      {
        farmerId: 1,
        'personalDetails.farmer_name': 1,
        'personalDetails.cc': 1,
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

      const farmerProduceArr = []
      const batchArr = []
      const lotArr = []

      for (let i = 0; i < farmer.farmerProduceIds.length; i++) {
        const farmerProduceId = farmer.farmerProduceIds[i]
        const farmerProduceObj = await getFarmerProduceDetailsById(
          farmerProduceId
        )
        farmerProduceArr.push(farmerProduceObj)

        let batchObj: {
          lotIdMongo?: string
        } = {}
        if (farmerProduceObj?.batchIdMongo) {
          batchObj = await getBatch(farmerProduceObj?.batchIdMongo)
          batchArr.push(batchObj)
        }
        if (batchObj && Object.keys(batchObj).length > 0) {
          const lotObj = await getLot(batchObj?.lotIdMongo)
          if (lotObj !== null) {
            lotArr.push(lotObj)
          }
        }
      }

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
    const farmer = await Farmers.findOne({ farmerId })
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
})

router.delete('/deleteAll', authorization('ADMIN'), async (req, res, next) => {
  try {
    await deleteAllFarmers()
    res.status(200).json({ message: 'All farmers deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
