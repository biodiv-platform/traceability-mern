import { createProduceHierarchy } from 'services'

const router = require('express').Router()

router.post('/new', async (req, res, next) => {
  try {
    const { produceHierarchy } = req.body

    const createdProduceHierarchy = await createProduceHierarchy(
      produceHierarchy
    )

    res.status(201).json(createdProduceHierarchy)
  } catch (err) {
    next(err)
  }
})

module.exports = router
