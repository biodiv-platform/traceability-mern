import { ModalField } from '../models'

import {
  updateModalFieldIndex,
  createModalField,
} from '../services/modalFieldService'

const router = require('express').Router()

router.post('/new', async (req, res, next) => {
  try {
    const { product, columnName, fields, isSaved, fieldsOf, isOptional } =
      req.body

    const modalField = new ModalField({
      product,
      columnName,
      fields,
      isSaved,
      fieldsOf,
      isOptional,
    })

    const createdModalField = await modalField.save()
    res.status(201).json(createdModalField)
  } catch (err) {
    next(err)
  }
})

router.get('/all', async (req, res, next) => {
  try {
    const modalFields = await ModalField.find()
    res.status(200).json(modalFields)
  } catch (err) {
    next(err)
  }
})

router.get('/:columnName', async (req, res, next) => {
  try {
    const { productId, columnName } = req.params
    const modalFields = await ModalField.find({
      product: productId,
      columnName,
    })
    res.status(200).json(modalFields)
  } catch (err) {
    next(err)
  }
})

router.put('/updateIndex', async (req, res, next) => {
  try {
    const { index, newModalField } = req.body

    const modalFields = await updateModalFieldIndex(index, newModalField)

    res.status(200).json(modalFields)
  } catch (err) {
    next(err)
  }
})

module.exports = router
