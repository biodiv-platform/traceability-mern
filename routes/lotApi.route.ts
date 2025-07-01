import { authorization, authorizationForChangeRequest } from '../services'
import {
  getAllLotCoCodesController,
  getLotAggregationsController,
  createNewLotController,
  splitLotController,
  updateLotController,
  getLotBatchesController,
  getLotByIdController,
  deleteAllLotsController
} from '../controllers/lotController'

const router = require('express').Router()

/* #swagger.tags = ['Lots'] */
router.get('/all/coCodes', authorization('UNION'), getAllLotCoCodesController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to get aggregated lot data.' */
router.get(
  '/aggregation/all',
  authorization('UNION'),
  getLotAggregationsController
)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to create a new lot.' */
router.post('/new', authorizationForChangeRequest(), createNewLotController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to split a lot.' */
router.put('/:lotId/split', authorizationForChangeRequest(), splitLotController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to update a lot.' */
router.put('/:lotId', authorizationForChangeRequest(), updateLotController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to get all batches by lotId.' */
router.get('/batches', authorization('UNION'), getLotBatchesController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to get a lot by lotId.' */
router.get('/show/:lotId', authorization('UNION'), getLotByIdController)

/* #swagger.tags = ['Lots']
   #swagger.description = 'Endpoint to delete all lots.' */
router.delete('/deleteAll', deleteAllLotsController)

module.exports = router
