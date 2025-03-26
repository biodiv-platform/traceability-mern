import { LOT_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { Lots } from '../models'
import {
  getLot,
  getBatchesByBatchIds,
  saveLot,
  getBatch,
  updateFarmerProduceIdsInLot,
  updateBatchLotId,
  authorization,
  getModalFields,
  updateLotColumnFields,
  deleteAllBatches,
  deleteAllLots,
  getFarmerProduceDetailsById,
  getlistData,
  getAggregations,
  getFarmerDetailsBySubmissionUUID,
  getActivitiesByHolderId,
  axPostActivity,
  authorizationForChangeRequest
} from '../services'
import { FIELD_TYPES } from '../utils/schema'

const router = require('express').Router()

router.get('/all/coCodes', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to get all lot coCodes.' */
  try {
    const lotData = await getlistData(req, Lots, LOT_PRE_DEFINED_FIELDS)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/LotList" },
       description: "List of all lot coCodes." } */
    res.status(200).json(lotData)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Lots']
       #swagger.description = 'Endpoint to get aggregated lot data.' */
    try {
      const aggregationFields = {
        type: FIELD_TYPES.GROUPANDCOUNT,
        quantity: FIELD_TYPES.MINMAX,
        lotStatus: FIELD_TYPES.GROUPANDCOUNT
      }

      const aggregationData = await getAggregations(
        req,
        Lots,
        aggregationFields
      )
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/LotAggregation" },
         description: "Aggregated lot data." } */
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

router.post('/new', authorizationForChangeRequest(), async (req, res, next) => {
  /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to create a new lot.' */
  try {
    const { productId } = req.params // TODO: not working
    const { id: userId, unionCode } = req.locals

    const { batchIds, ...lotData } = req.body

    if (lotData.unionCode !== unionCode) {
      res.status(403).json({ message: 'Unauthorized' })
    }

    if (!batchIds || batchIds.length === 0) {
      res.status(400).json({ message: 'Batch ids are required to create lot' })
    }

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'LOT'
    ) // TODO: replace it with dynamic product id

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => {
        return a.index - b.index
      }
    )

    // logic to get first column as ADD and others as NOTAPPLICABLE except the optional ones
    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (obj, index) => {
        if (index === 0) {
          obj.columnStatus = 'ADD'
          return obj
        } else {
          obj.columnStatus = obj.isOptional ? 'ADD' : 'NOTAPPLICABLE'
          return obj
        }
      }
    )

    const lot = {
      ...lotData,
      productId,
      lotStatus: 'AT_CO_OPERATIVE',
      isDeleted: false,
      modalFieldCombined: updatedModalFieldsArr,
      batchIds,
      flag: false,
      flagReason: []
    }

    const savedLot = await saveLot(lot) // Saving the lot
    const { createdAt, lotId, lotStatus }: any = savedLot

    const farmerProduceIdsArr = []

    for (const batchId of batchIds) {
      // Update the lot id in batch
      const batch = await getBatch(batchId)
      if (!batch) {
        throw new Error('Invalid batch id found')
      }
      const { farmerProduceIds } = await updateBatchLotId(batchId, {
        lotId: lotId.toString(),
        lotStatus,
        lotIdMongo: savedLot._id.toString(),
        batchStatus: 'Lot created'
      })
      farmerProduceIdsArr.push(...farmerProduceIds)
    }

    const updatedLotWithFarmerProduceIds = await updateFarmerProduceIdsInLot(
      savedLot._id,
      farmerProduceIdsArr
    )

    // Add activity of lot creation
    const activity = {
      activityHolderId: savedLot.id,
      activityHolderType: 'LOT',
      authorId: userId,
      activityType: 'LOT_CREATION',
      rootHolderId: savedLot.id,
      rootHolderType: 'content.eml.Lot',
      subRootHolderId: savedLot.id,
      subRootHolderType: 'content.eml.Lot',
      activityDescription: `Lot: ${lot.lotName} created.`,
      isShowable: true
    }

    await axPostActivity(req, activity)

    const result = {
      lot: updatedLotWithFarmerProduceIds,
      batches: batchIds
    }
    /* #swagger.responses[201] = {
       schema: { "$ref": "#/definitions/Lot" },
       description: "Created lot with batches." } */
    res.status(201).json(result)
  } catch (err) {
    next(err)
    // TODO: handle pagination
  }
})

router.put(
  '/:lotId',
  authorizationForChangeRequest(),
  async (req, res, next) => {
    /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to update a lot.' */
    try {
      const { lotId } = req.params
      const { id: userId, unionCode } = req.locals

      const lotData = req.body

      const lot = await getLot(lotId)

      if (!lot) {
        res.status(404).json({ message: 'Lot not found' })
      }

      if (lot.unionCode !== unionCode) {
        res.status(403).json({ message: 'Unauthorized' })
      }

      const findModalFieldIndex = lot.modalFieldCombined.findIndex(
        (modalField) => {
          return modalField.modalFieldId === lotData.selectedModalFieldId
        }
      )

      if (findModalFieldIndex === -1) {
        throw new Error('Invalid modal field id found')
      }

      const lotModalFieldsArr = lot.modalFieldCombined.map((obj, index) => {
        if (index === findModalFieldIndex) {
          // Change Column Status to DONE if the field is finalizeBatchColumn
          obj.columnStatus = lotData.fields.finalizeLotColumn ? 'DONE' : 'EDIT'
          // Iterate over each field in obj.fields
          obj.fields.forEach((field) => {
            // Check if the field's name is present as a key in batchData.fields
            // eslint-disable-next-line
            if (lotData.fields.hasOwnProperty(field?.name)) {
              // Update the value key with the corresponding value from batchData.fields
              field.value = lotData.fields[field.name]
            }
          })
          // Update lastUpdatedAt with current timestamp
          obj.lastUpdatedAt = new Date().toISOString()
          return obj
        } else if (
          lotData.fields.finalizeLotColumn &&
          index === Number(findModalFieldIndex) + 1
        ) {
          // Change Next column status to ADD except the optional ones
          if (!obj.isOptional) {
            obj.columnStatus = 'ADD'
          }

          // update lot Status
          // TODO: revisit the logic
          index === lot.modalFieldCombined.length - 1 && !obj.isOptional
            ? (lot.lotStatus = 'AT_UNION')
            : (lot.lotStatus = 'IN_TRANSPORT')

          return obj
        }
        return obj
      })

      lot.modalFieldCombined = lotModalFieldsArr

      const updatedLot = await updateLotColumnFields(lot)

      const timestamp = new Date().toISOString()

      const activity = {
        activityHolderId: lot.id,
        activityHolderType: 'LOT',
        authorId: userId,
        lastUpdated: timestamp,
        activityType: 'LOT_UPDATE',
        rootHolderId: lot.id,
        rootHolderType: 'content.eml.Lot',
        subRootHolderId: lot.id,
        subRootHolderType: 'content.eml.Lot',
        activityDescription: `${lotData.columnName} column updated.`,
        isShowable: true
      }

      await axPostActivity(req, activity)

      /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Lot" },
       description: "Updated lot." } */
      res.status(200).json(updatedLot)
    } catch (err) {
      next(err)
    }
  }
)

// get request to get all batches by lotId
router.get('/batches', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to get all batches by lotId.' */
  try {
    const { lotId } = req.query
    const lot = await getLot(lotId)
    if (!lot) {
      throw new Error('Invalid lot id found')
    }
    const { batchIds } = lot

    const batches = await getBatchesByBatchIds(batchIds)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/BatchList" },
       description: "List of batches for the specified lot." } */
    res.status(200).json(batches)
  } catch (err) {
    next(err)
  }
})

router.get('/show/:lotId', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to get lot details.' */
  try {
    const { lotId } = req.params
    const lot = await getLot(lotId)
    if (!lot) {
      throw new Error('Invalid lot id found')
    }

    const batchArr = []
    const farmerProduceArr = []
    const farmerArr = []
    const farmerLocationArr = []

    // Use a Map to track unique farmers by their ID
    const farmerMap = new Map()

    for (const batchId of lot.batchIds) {
      const batch = await getBatch(batchId)
      if (!batch) {
        throw new Error('Invalid batch id found')
      }
      batchArr.push(batch)

      for (const farmerProduceId of batch.farmerProduceIds) {
        const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId)
        if (!farmerProduce) {
          throw new Error('Invalid farmer produce id found')
        }
        const farmer = await getFarmerDetailsBySubmissionUUID(
          farmerProduce.farmerEID
        )
        if (!farmer) {
          throw new Error('Invalid farmer id found')
        }

        // Only add if not already in the map
        if (!farmerMap.has(farmer._id.toString())) {
          farmerMap.set(farmer._id.toString(), farmer)
          farmerArr.push(farmer)

          // Add to farmerLocationArr only if the farmer is unique
          farmerLocationArr.push({
            type: 'Feature',
            geometry: {
              type: farmer.centroid.type,
              coordinates: farmer.centroid.coordinates
            },
            properties: {
              name: farmer.farmerName,
              _id: farmer._id,
              farmerId: farmer.farmerId,
              cc: farmer.cc,
              batchId: batch.batchId,
              noOfFarms: farmer.noOfFarmPlots
            }
          })
        }

        farmerProduceArr.push({
          ...farmerProduce.toObject(),
          cc: farmer?.cc
        })
      }
    }

    const activityArr = await getActivitiesByHolderId(lotId)

    const result = {
      lot,
      batches: batchArr,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr,
      activityArr
    }
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/LotDetails" },
       description: "Lot details with batches, farmer produce, farmer, farmer location, and activities." } */
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.delete('/deleteAll', async (req, res, next) => {
  /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to delete all lots and batches.' */
  try {
    const result = await deleteAllBatches()
    const result2 = await deleteAllLots()
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/DeleteResult" },
       description: "Result of deleting all lots and batches." } */
    res.status(200).json({ result, result2 })
  } catch (err) {
    next(err)
  }
})

module.exports = router
