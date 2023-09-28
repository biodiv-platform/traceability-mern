import { ModalField } from '../models'
import { updateModalFieldIndex } from '../services'

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
      isOptional
    })

    const createdModalField = await modalField.save()
    res.status(201).json(createdModalField)
  } catch (err) {
    next(err)
  }
})

// get all modalFields column by fieldNames(batch or lot)
// TODO: add middleware
router.get('/all/:fieldOf', async (req, res, next) => {
  try {
    const modalFields = await ModalField.find({
      fieldsOf: req.params.fieldOf.toUpperCase()
    })

    const columnNames = modalFields.map((modalField) => {
      return {
        columnName: modalField.columnName,
        modalFieldId: modalField._id,
        modalIndex: modalField.index
      }
    })

    res.status(200).json(columnNames)
  } catch (err) {
    res.status(500).json(err)
    next(err)
  }
})

router.get('/:columnName', async (req, res, next) => {
  try {
    const { productId, columnName } = req.params
    const modalFields = await ModalField.find({
      product: productId,
      columnName
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
