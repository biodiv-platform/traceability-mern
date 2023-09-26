import axios from 'axios'
import { FarmerProduce } from '../models'
import {
  postFarmerProduceDetail,
  updateFarmerCollection,
  getLastFetchedTime,
  saveLastFetchedTime,
  authorization
} from '../services'

const router = require('express').Router()

// get all farmer produce details
router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await FarmerProduce.find()
    res.status(200).json(BatchArr)
  } catch (err) {
    next(err)
  }
})

router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    const { productId } = req.params // TODO: not working

    const { ...farmerData } = req.body
    const farmer = {
      product: productId,
      ...farmerData
    }

    const savedFarmer = await postFarmerProduceDetail(farmer)

    // update farmer collection
    await updateFarmerCollection(farmer.farmerId, savedFarmer._id)

    // Saving the farmer
    res.status(200).json(savedFarmer)
  } catch (err) {
    next(err)
  }
})

router.get('/getFarmerProduceFromODK', async (req, res, next) => {
  try {
    console.log('getFarmerProduceFromODK')
    // get the last featched time from db
    const LastFeatchedTime = await getLastFetchedTime()

    const data = 'Namutamba Zone' // TODO: do we need this?

    const config = {
      method: 'get',
      url: `https://staging.eastafricacoffee.org/odk-api/api/v1/projects/2/forms/submissions/Buzaaya-Union-Farmer-Registraion?gtDate=${LastFeatchedTime.toISOString()}`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data
    }

    console.log('config url: ', config.url)
    console.log(
      'normal url: ',
      'https://staging.eastafricacoffee.org/odk-api/api/v1/projects/2/forms/submissions/Buzaaya-Union-Farmer-Registraion?gtDate=2023-09-18T23:59:59.999Z'
    )

    const response = await axios(config)

    // save the last featched time in db
    await saveLastFetchedTime(new Date())

    //  cross check with the farmer member collection

    res.status(200).json(response.data)
  } catch (err) {
    console.log('error in getFarmerProduceFromODK')
    next(err)
    throw err
  }
})

module.exports = router
