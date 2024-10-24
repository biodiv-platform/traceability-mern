/*
WARNING: This route is not being used. It is only here for future reference.
*/

import { unionIdToUnionName } from '../utils'
import {
  authorization,
  retrieveFarmerMembersLastFetchedTime,
  retrieveFarmerProduceLastFetchedTime
} from '../services'

const { Product } = require('../models')

const router = require('express').Router()

router.get('/', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get all products.' */
  try {
    const products = await Product.find()
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Product" },
       description: "List of all products." } */
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.get('/lastSyncedTimeFM', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get last synced time for Farmer Members.' */
  try {
    let { key } = req.query
    key = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerMembersLastFetchedTime(key)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/LastSyncedTime" },
       description: "Last synced time for Farmer Members." } */
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
})

router.get('/lastSyncedTimeFP', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get last synced time for Farmer Produce.' */
  try {
    let { key } = req.query
    key = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerProduceLastFetchedTime(key)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/LastSyncedTime" },
       description: "Last synced time for Farmer Produce." } */
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
})

router.get('/:productId', async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to get a specific product by ID.' */
  try {
    const { productId } = req.params
    const products = await Product.findById(productId)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Product" },
       description: "Product details." } */
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.post('/', authorization('ADMIN'), async (req, res, next) => {
  /* #swagger.tags = ['Product']
     #swagger.description = 'Endpoint to create a new product.' */
  try {
    const { productName, description, columns } = req.body

    const product = new Product({
      productName,
      description,
      columns
    })

    const createdProduct = await product.save()
    /* #swagger.responses[201] = {
       schema: { "$ref": "#/definitions/Product" },
       description: "Product created successfully." } */
    res.status(201).json(createdProduct)
  } catch (err) {
    next(err)
  }
})

module.exports = router
