import { FarmerProduce } from '../models'
import {
  postFarmerProduceDetail,
  updateFarmerCollection,
  authorization
} from '../services'

const router = require('express').Router()

// router.get("/all/cc", authorization("UNION"), async (req, res, next) => { //TODO: uncomment me
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

    const updatedFarmerCollection = await updateFarmerCollection(
      farmer.farmerId,
      savedFarmer._id
    )

    // Saving the farmer
    res.status(200).json(savedFarmer)
  } catch (err) {
    next(err)
  }
})

module.exports = router
