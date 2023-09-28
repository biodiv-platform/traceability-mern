/*
WARNING: This route is not being used. It is only here for future reference.
*/

const router = require('express').Router()

const { Product } = require('../models')

router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find()
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.get('/products/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const products = await Product.findById(productId)
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

router.post('/products', async (req, res, next) => {
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
