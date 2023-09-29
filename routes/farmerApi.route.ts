import axios from 'axios'
import { Farmers } from '../models'
import {
  postFarmersDetail,
  authorization,
  retrieveFarmerMembersLastFetchedTime,
  updateFarmerMembersLastFetchedTime,
  handleFarmerDataFromODK
} from '../services'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    // eslint-disable-next-line
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await Farmers.find()
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
    // get the last fetched time from db
    const LastFetchedTime: any = await retrieveFarmerMembersLastFetchedTime()

    console.log('LastFetchedTimeId', LastFetchedTime)

    const config = {
      method: 'get',
      url: `https://staging.eastafricacoffee.org/odk-api/api/v1/projects/2/forms/submissions/Buzaaya-Union-Farmer-Registraion?gtDate=${LastFetchedTime}`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }

    const response = await axios(config)

    handleFarmerDataFromODK(response)

    const updatedLastFetchedTime = new Date().toISOString()
    // save the last fetched time in db
    // await updateFarmerMembersLastFetchedTime(updatedLastFetchedTime) //FIXME: uncomment after development of handleFarmerDataFromODK function

    res.status(200).json(response.data)
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error in Fetching Farmer Members From ODK' })
    next(err)
    throw err
  }
})

router.get('/:farmerId', authorization('UNION'), async (req, res, next) => {
  try {
    const { farmerId } = req.params
    const farmer = await Farmers.findOne({ farmerId })
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
})

module.exports = router
