import { Batches, Container, FarmerProduce, Lots } from '../models'
import { documentAutocomplete } from '../services'
import { MODELS } from '../utils/schema'

const router = require('express').Router()

router.get('/document/autocomplete', async (req, res, next) => {
  try {
    const model = req.query.model

    // Check if the model exists in the allowed models
    if (!MODELS[model]) {
      throw new Error('Invalid model provided.')
    }

    // Pass the model to the farmerAutocomplete function
    const results = await documentAutocomplete(req, MODELS[model])
    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

router.get('/count', async (req, res, next) => {
  try {
    const unionCode = Number(req.query.union)

    const farmerProduceCount = await FarmerProduce.countDocuments({
      produceStatus: { $in: ['ready_for_batch'] },
      unionCode
    })

    const batchCount = await Batches.countDocuments({
      batchStatus: { $in: ['pending', 'ready_for_lot'] },
      unionCode
    })

    const lotCount = await Lots.countDocuments({
      lotStatus: { $in: ['pending', 'ready_for_container'] },
      unionCode
    })

    const containerCount = await Container.countDocuments({
      _id: { $exists: true }, // TODO: Add a condition here
      unionCode
    })

    const count = {
      farmerProduceCount,
      batchCount,
      lotCount,
      containerCount
    }

    res.status(200).json({ count })
  } catch (err) {
    next(err)
  }
})

module.exports = router
