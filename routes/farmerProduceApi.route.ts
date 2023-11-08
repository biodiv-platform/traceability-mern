import { FarmerProduce } from '../models'
import {
  postFarmerProduceDetail,
  updateFarmerCollection,
  authorization,
  handleFarmerProduceDataFromODK
} from '../services'

const router = require('express').Router()

// get all farmer produce details
router.get('/all', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    // future scope features
    // eslint-disable-next-line
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await FarmerProduce.find({
      ccCode: { $in: ccCodes.split(',').map(Number) }
    })
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

    await updateFarmerCollection(farmer.farmerId, savedFarmer._id)

    // Saving the farmer
    res.status(200).json(savedFarmer)
  } catch (err) {
    next(err)
  }
})

router.post('/mockODKData', async (req: any, res: any, next: any) => {
  try {
    const { farmerProduceData } = req.body

    const isSuccess = await handleFarmerProduceDataFromODK({
      value: farmerProduceData
    })

    if (isSuccess) {
      res.status(200).json({ message: 'Farmer data saved successfully' })
    } else {
      res.status(500).json({ message: 'Error while saving farmer data' })
    }
  } catch (err) {
    next(err)
  }
})

module.exports = router
