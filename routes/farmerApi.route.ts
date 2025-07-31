import { Router } from 'express'
import {
  authorization,
  authenticateCronJob,
  authorizationForChangeRequest
} from '../services'
import {
  getAllFarmers,
  getAggregatedFarmerData,
  createFarmer,
  fetchFarmerMembersFromODKCron,
  fetchFarmerMembersFromODKOnDemand,
  getFarmersByUnion,
  getFarmerDetails,
  getFarmerById,
  getFarmerByUUID,
  updateFarmer,
  deleteFarmer
} from '../controllers/farmerController'

const router = Router()

router.get('/all', authorization('UNION'), getAllFarmers)

router.get('/aggregation/all', authorization('UNION'), getAggregatedFarmerData)

router.post('/new', authorizationForChangeRequest(), createFarmer)

router.get(
  '/fetchFarmerMemberFromODKApiCRON',
  authenticateCronJob,
  fetchFarmerMembersFromODKCron
)

router.get(
  '/fetchFarmerMemberFromODKApiOnDemand',
  authorization('UNION'),
  fetchFarmerMembersFromODKOnDemand
)

router.get('/allByUnion', authorization('UNION'), getFarmersByUnion)

router.get('/show/:farmerId', authorization('UNION'), getFarmerDetails)

router.get('/:farmerId', authorization('UNION'), getFarmerById)

router.get('/uuid/:farmerUUID', authorization('UNION'), getFarmerByUUID)

/* #swagger.tags = ['Farmers'] */
/* #swagger.description = 'Endpoint to update farmer details.' */
/* #swagger.responses[200] = {
   schema: { "$ref": "#/definitions/Farmer" },
   description: "Updated farmer details." } */
router.put('/:farmerId', authorizationForChangeRequest(), updateFarmer)

/* #swagger.tags = ['Farmers'] */
/* #swagger.description = 'Endpoint to soft delete a farmer.' */
/* #swagger.responses[200] = {
   schema: { "$ref": "#/definitions/DeleteResponse" },
   description: "Farmer deleted." } */
router.delete('/:farmerId', authorization('UNION'), deleteFarmer)

module.exports = router
