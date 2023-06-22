import { Farmers } from '../models'
import { postFarmersDetail } from '../services/farmerService'

const router = require('express').Router()

// router.get("/all/cc", authorization("UNION"), async (req, res, next) => { //TODO: uncomment me
router.get('/all', async (req, res, next) => {
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

router.post('/new', async (req, res, next) => {
  try {
    const { productId } = req.params // TODO: not working

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

router.get('/:farmerId', async (req, res, next) => {
  try {
    const { farmerId } = req.params
    const farmer = await Farmers.findOne({ farmerId })
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
})

module.exports = router
