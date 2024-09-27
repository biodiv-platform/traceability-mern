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

module.exports = router
