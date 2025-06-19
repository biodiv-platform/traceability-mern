import { Batches, Container, FarmerProduce, Farmers, Lots } from '../models'
import { documentAutocomplete } from '../services'
import { MODELS } from '../utils/schema'
import { Parser } from 'json2csv'
import mongoose from 'mongoose'

const router = require('express').Router()

router.get('/document/autocomplete', async (req, res, next) => {
  try {
    const model = req.query.model

    // Check if the model exists in the allowed models
    if (!MODELS[model]) {
      throw new Error('Invalid model provided.')
    }

    // Pass the model to the farmerAutocomplete function
    const results = await documentAutocomplete(req, MODELS[model])
    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

router.get('/count', async (req, res, next) => {
  try {
    const unionCode = Number(req.query.union)

    const farmerProduceCount = await FarmerProduce.countDocuments({
      produceStatus: { $in: ['ready_for_batch'] },
      unionCode
    })

    const batchCount = await Batches.countDocuments({
      batchStatus: { $in: ['pending', 'ready_for_lot'] },
      unionCode
    })

    const lotCount = await Lots.countDocuments({
      lotStatus: { $in: ['pending', 'ready_for_container'] },
      unionCode
    })

    const containerCount = await Container.countDocuments({
      _id: { $exists: true }, // TODO: Add a condition here
      unionCode
    })

    const count = {
      farmerProduceCount,
      batchCount,
      lotCount,
      containerCount
    }

    res.status(200).json({ count })
  } catch (err) {
    next(err)
  }
})

router.post('/download/:level', async (req, res) => {
  const { level } = req.params
  const { ids } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .send("Missing or invalid 'ids' array in request body.")
  }

  const idArray = ids.map((id) => new mongoose.Types.ObjectId(id))
  const csvData = []

  try {
    if (level === 'container') {
      const containers = await Container.find({
        _id: { $in: idArray },
        isDeleted: false
      }).lean()

      for (const container of containers) {
        const lots = await Lots.find({ containerId: container._id }).lean()

        for (const lot of lots) {
          const batches = await Batches.find({
            _id: { $in: lot.batchIds }
          }).lean()
          const produces = await FarmerProduce.find({
            _id: { $in: lot.farmerProduceIds }
          }).lean()

          for (const batch of batches) {
            for (const produce of produces) {
              const farmer = await Farmers.findOne({
                instanceID: produce.farmerEID
              }).lean()

              csvData.push({
                containerId: container._id,
                containerName: container.containerName || '',
                lotId: lot._id,
                lotName: lot.lotName,
                batchId: batch._id,
                batchName: batch.batchName || '',
                produceId: produce._id,
                farmerId: produce.farmerId || '',
                farmerName: farmer?.farmerName || '',
                gender: farmer?.gender || '',
                cc: farmer?.cc || '',
                village: farmer?.village || '',
                quantity: produce.quantity || 0,
                noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
                landAcreage: farmer?.landAcreage || 0,
                coffeeAcreage: farmer?.coffeeAcreage || 0,
                noOfFarmPlots: farmer?.noOfFarmPlots || 0,
                yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
                isLocationVerified: farmer?.isLocationVerified || false,
                dateOfProduceCollection: produce.dateOfCollection || '',
                farmLocations: farmer?.centroid.coordinates || ''
              })
            }
          }
        }
      }
    } else if (level === 'lot') {
      const lots = await Lots.find({
        _id: { $in: idArray },
        isDeleted: false
      }).lean()

      for (const lot of lots) {
        const batches = await Batches.find({
          _id: { $in: lot.batchIds }
        }).lean()
        const produces = await FarmerProduce.find({
          _id: { $in: lot.farmerProduceIds }
        }).lean()

        for (const batch of batches) {
          for (const produce of produces) {
            const farmer = await Farmers.findOne({
              instanceID: produce.farmerEID
            }).lean()
            csvData.push({
              lotId: lot._id,
              lotName: lot.lotName,
              batchId: batch._id,
              batchName: batch.batchName || '',
              produceId: produce._id,
              farmerId: produce.farmerId || '',
              farmerName: farmer?.farmerName || '',
              gender: farmer?.gender || '',
              cc: farmer?.cc || '',
              village: farmer?.village || '',
              quantity: produce.quantity || 0,
              noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
              landAcreage: farmer?.landAcreage || 0,
              coffeeAcreage: farmer?.coffeeAcreage || 0,
              noOfFarmPlots: farmer?.noOfFarmPlots || 0,
              yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
              isLocationVerified: farmer?.isLocationVerified || false,
              dateOfProduceCollection: produce.dateOfCollection || '',
              farmLocations: farmer?.centroid.coordinates || ''
            })
          }
        }
      }
    } else if (level === 'batch') {
      const batches = await Batches.find({
        _id: { $in: idArray },
        isDeleted: false
      }).lean()

      for (const batch of batches) {
        const produces = await FarmerProduce.find({
          _id: { $in: batch.farmerProduceIds }
        }).lean()

        for (const produce of produces) {
          const farmer = await Farmers.findOne({
            instanceID: produce.farmerEID
          }).lean()
          csvData.push({
            batchId: batch._id,
            batchName: batch.batchName || '',
            produceId: produce._id,
            farmerId: produce.farmerId || '',
            farmerName: farmer?.farmerName || '',
            gender: farmer?.gender || '',
            cc: farmer?.cc || '',
            village: farmer?.village || '',
            quantity: produce.quantity || 0,
            noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
            landAcreage: farmer?.landAcreage || 0,
            coffeeAcreage: farmer?.coffeeAcreage || 0,
            noOfFarmPlots: farmer?.noOfFarmPlots || 0,
            yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
            isLocationVerified: farmer?.isLocationVerified || false,
            dateOfProduceCollection: produce.dateOfCollection || '',
            farmLocations: farmer?.centroid.coordinates || ''
          })
        }
      }
    } else if (level === 'produce') {
      const produces = await FarmerProduce.find({
        _id: { $in: idArray },
        isDeleted: false
      }).lean()

      for (const produce of produces) {
        if (!produce.farmerId) continue
        const farmer = await Farmers.findOne({
          instanceID: produce.farmerEID
        }).lean()

        csvData.push({
          produceId: produce._id,
          farmerId: produce.farmerId || '',
          farmerName: farmer?.farmerName || '',
          gender: farmer?.gender || '',
          cc: farmer?.cc || '',
          village: farmer?.village || '',
          quantity: produce.quantity || 0,
          noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
          landAcreage: farmer?.landAcreage || 0,
          coffeeAcreage: farmer?.coffeeAcreage || 0,
          noOfFarmPlots: farmer?.noOfFarmPlots || 0,
          yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
          isLocationVerified: farmer?.isLocationVerified || false,
          dateOfProduceCollection: produce.dateOfCollection || '',
          farmLocations: farmer?.centroid.coordinates || ''
        })
      }
    } else {
      return res.status(400).send('Invalid level specified.')
    }

    const parser = new Parser()
    const csv = parser.parse(csvData)

    res.header('Content-Type', 'text/csv')
    res.attachment(`${level}_data.csv`)
    res.send(csv)
  } catch (err) {
    console.error('CSV download error:', err)
    res.status(500).send('Failed to generate CSV.')
  }
})

module.exports = router
