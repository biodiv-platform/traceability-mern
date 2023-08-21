import { Farmers } from '../models'
import { postFarmersDetail, authorization } from '../services'

const router = require('express').Router()

router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
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
