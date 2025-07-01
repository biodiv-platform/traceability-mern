import { authorization, authorizationForChangeRequest } from '../services'
import {
  getBatchCoCodes,
  getBatchAggregationData,
  getFarmerProduceByBatchId,
  getBatchDetails,
  createNewBatch,
  updateBatchDetails
} from '../controllers/batchController'

const router = require('express').Router()

router.get('/all/coCodes', authorization('UNION'), getBatchCoCodes)

router.get('/aggregation/all', authorization('UNION'), getBatchAggregationData)

router.get(
  '/:batchId/farmerProduce',
  authorization('UNION'),
  getFarmerProduceByBatchId
)

router.get('/show/:batchId', authorization('UNION'), getBatchDetails)

router.post('/new', authorizationForChangeRequest(), createNewBatch)

router.put('/:batchId', authorizationForChangeRequest(), updateBatchDetails)

module.exports = router
