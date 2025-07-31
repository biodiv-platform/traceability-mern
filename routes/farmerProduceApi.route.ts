import {
  authorization,
  authenticateCronJob,
  authorizationForChangeRequest
} from '../services'
import {
  getAllFarmerProduce,
  getFarmerProduceAggregation,
  fetchFarmerProduceFromODKCron,
  fetchFarmerProduceFromODKOnDemand,
  getFarmerProduceById,
  createFarmerProduce
} from '../controllers/farmerProduceController'

const router = require('express').Router()

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to get all farmer produce data.' */
router.get('/all', authorization('UNION'), getAllFarmerProduce)

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to get aggregated farmer produce data.' */
router.get(
  '/aggregation/all',
  authorization('UNION'),
  getFarmerProduceAggregation
)

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to fetch farmer produce data from ODK API (CRON job).' */
router.get(
  '/fetchFarmerProduceFromODKApiCRON',
  authenticateCronJob,
  fetchFarmerProduceFromODKCron
)

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to fetch farmer produce data from ODK API on demand.' */
router.get(
  '/fetchFarmerProduceFromODKApiOnDemand',
  authorization('UNION'),
  fetchFarmerProduceFromODKOnDemand
)

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to get specific farmer produce details.' */
router.get(
  '/show/:farmerProduceId',
  authorization('UNION'),
  getFarmerProduceById
)

/* #swagger.tags = ['Farmer Produce']
   #swagger.description = 'Endpoint to create a new farmer produce.' */
router.post('/new', authorizationForChangeRequest(), createFarmerProduce)

module.exports = router
