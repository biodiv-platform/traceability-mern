import { Router } from 'express'
import { authorization } from '../services'
import {
  getProducts,
  getProduct,
  createNewProduct,
  getFarmerMembersLastSyncedTime,
  getFarmerProduceLastSyncedTime
} from '../controllers/productController'

const router = Router()

router.get('/', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get all products.' */
  /* #swagger.responses[200] = {
     schema: { "$ref": "#/definitions/Product" },
     description: "List of all products." } */
  await getProducts(req, res, next)
})

router.get('/lastSyncedTimeFM', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get last synced time for Farmer Members.' */
  /* #swagger.responses[200] = {
     schema: { "$ref": "#/definitions/LastSyncedTime" },
     description: "Last synced time for Farmer Members." } */
  await getFarmerMembersLastSyncedTime(req, res, next)
})

router.get('/lastSyncedTimeFP', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get last synced time for Farmer Produce.' */
  /* #swagger.responses[200] = {
     schema: { "$ref": "#/definitions/LastSyncedTime" },
     description: "Last synced time for Farmer Produce." } */
  await getFarmerProduceLastSyncedTime(req, res, next)
})

router.get('/:productId', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get a specific product by ID.' */
  /* #swagger.responses[200] = {
     schema: { "$ref": "#/definitions/Product" },
     description: "Product details." } */
  await getProduct(req, res, next)
})

router.post('/', authorization('ADMIN'), async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to create a new product.' */
  /* #swagger.responses[201] = {
     schema: { "$ref": "#/definitions/Product" },
     description: "Product created successfully." } */
  await createNewProduct(req, res, next)
})

module.exports = router
