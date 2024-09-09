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
  try {
    const products = await Product.find()
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.get('/lastSyncedTimeFM', async (req, res, next) => {
  try {
    let { key } = req.query
    key = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerMembersLastFetchedTime(key)
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
})

router.get('/lastSyncedTimeFP', async (req, res, next) => {
  try {
    let { key } = req.query
    key = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerProduceLastFetchedTime(key)
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
})

router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const products = await Product.findById(productId)
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.post('/', authorization('ADMIN'), async (req, res, next) => {
  try {
    const { productName, description, columns } = req.body

    const product = new Product({
      productName,
      description,
      columns
    })

    const createdProduct = await product.save()
    res.status(201).json(createdProduct)
  } catch (err) {
    next(err)
  }
})

module.exports = router
