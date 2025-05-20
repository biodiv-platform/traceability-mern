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
  axPostActivity,
  authorizationForChangeRequest
} from '../services'
import { FIELD_TYPES } from '../utils/schema'
import { LOT_FIELD_UPDATE_RULES } from '../static/constants'
import { ISubLot } from 'interfaces/traceability'

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
        isReadyForContainer: FIELD_TYPES.BOOLEAN,
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
    const { productId } = req.params // FIXME: not working
    const { unionCode } = req.locals

    const { batchIds, ...lotData } = req.body

    let isReadyForContainer = false

    if (lotData.unionCode !== unionCode) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to create this lot.' })
    }

    if (!batchIds || batchIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'Batch ids are required to create lot' })
    }

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'LOT'
    ) // FIXME: replace it with dynamic product id

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => {
        return a.index - b.index
      }
    )

    // logic to autofill the lot modal fields based on the lot data
    sortedModalFieldsArrByIndex.forEach((modalFieldsArr) => {
      const fieldRules =
        Object.keys(LOT_FIELD_UPDATE_RULES) &&
        LOT_FIELD_UPDATE_RULES[modalFieldsArr.columnName]
      if (fieldRules) {
        modalFieldsArr.fields.forEach((field) => {
          if (fieldRules[field.name]) {
            field.value = fieldRules[field.name](lotData)
          }
        })
      }
    })

    // logic to get first column as ADD and others as NOTAPPLICABLE except the optional ones
    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (obj, index, arr) => {
        // If the first column is optional, set it to "ADD"
        if (index === 0 && obj.isOptional) {
          obj.columnStatus = 'ADD'

          // Find the next non-optional column and mark it as "ADD" too
          const nextNonOptionalIndex = arr.findIndex(
            (item, i) => i > index && !item.isOptional
          )
          if (nextNonOptionalIndex !== -1) {
            arr[nextNonOptionalIndex].columnStatus = 'ADD'
          }
          return obj
        }

        // If the first column is not optional, set it to "ADD"
        if (index === 0) {
          obj.columnStatus = 'ADD'
          return obj
        }

        // If this column was already marked as "ADD" in a previous iteration, keep it that way
        if (obj.columnStatus === 'ADD') {
          return obj
        }

        // Set optional columns to "ADD"
        if (obj.isOptional) {
          obj.columnStatus = 'ADD'
          return obj
        }

        // Default to "NOTAPPLICABLE" for non-optional columns (except the first non-optional column after an optional start)
        obj.columnStatus = 'NOTAPPLICABLE'
        return obj
      }
    )

    // if there are no mandatory fields, then the batch is ready for lot or if all the fields are optional or not applicable
    isReadyForContainer =
      updatedModalFieldsArr.length === 0 ||
      updatedModalFieldsArr.every(
        (field) =>
          field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
      )

    const lot = {
      ...lotData,
      productId,
      lotStatus: isReadyForContainer ? 'ready_for_container' : 'pending',
      lotCategory: 'lot',
      isSubLotCreated: false,
      isReadyForContainer,
      isDeleted: false,
      modalFieldCombined: updatedModalFieldsArr,
      batchIds,
      flag: false,
      flagReason: []
    }

    const savedLot = await saveLot(lot) // Saving the lot
    const {
      lotId,
      lotStatus
    }: {
      lotId: string
      lotStatus: string
    } = savedLot

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
        batchStatus: 'lot_created'
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
  }
})

router.put(
  '/:lotId/split',
  authorizationForChangeRequest(),
  async (req, res, next) => {
    try {
      const { lotId } = req.params
      const { unionCode } = req.locals
      const lotData = req.body

      const lot = await getLot(lotId)

      if (!lot) {
        return res.status(404).json({ message: 'Lot not found' })
      }

      if (lot.unionCode !== unionCode) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to modify this lot.' })
      }

      const modalFieldIndex = lot.modalFieldCombined.findIndex(
        (modalField) => modalField.modalFieldId === lotData.selectedModalFieldId
      )

      if (modalFieldIndex === -1) {
        return res.status(400).json({ message: 'Invalid modal field found' })
      }

      const modalField = lot.modalFieldCombined[modalFieldIndex]

      modalField.fields.forEach((field) => {
        if (lotData.fields.hasOwnProperty(field?.name)) {
          field.value = lotData.fields[field.name]
        }
      })
      modalField.lastUpdatedAt = new Date().toISOString()

      if (modalField.columnName === 'Grading Report') {
        const splitFieldNames = ['SC_18', 'SC_15', 'SC_12', 'all_bhp', 'UG']

        const splittedLots = Object.keys(lotData.fields)
          .filter((key) => splitFieldNames.includes(key))
          .map((key) => {
            const subLot: ISubLot = {
              ...lot,
              lotId: `${lot.lotId}-SL-${key}`,
              lotName: `${lot.lotName}_SL_${key}`,
              type: `${lot.type}-${key}`,
              lotStatus: 'ready_for_container',
              lotCategory: 'sub_lot',
              quantity: lotData.fields[key],
              isReadyForContainer: true,
              modalFieldCombined: lot.modalFieldCombined.map((field, idx) =>
                idx === modalFieldIndex
                  ? { ...field, columnStatus: 'DONE' }
                  : field
              )
            }

            delete subLot.createdAt
            delete subLot.lastUpdatedAt
            delete subLot.id
            delete subLot._id

            return subLot
          })

        lot.lotStatus = 'sub_lot_created'
        lot.isReadyForContainer = false
        lot.modalFieldCombined[modalFieldIndex].columnStatus = 'DONE'
        lot.isSubLotCreated = true

        const savedSplittedLots = []
        for (const subLot of splittedLots) {
          const savedLot = await saveLot(subLot)
          savedSplittedLots.push(savedLot)
          const activity = {
            activityHolderId: savedLot.id,
            activityHolderType: 'LOT',
            activityType: 'LOT_CREATION',
            rootHolderId: savedLot.id,
            rootHolderType: 'content.eml.Lot',
            subRootHolderId: savedLot.id,
            subRootHolderType: 'content.eml.Lot',
            activityDescription: `Sub Lot: ${lot.lotName} created.`,
            isShowable: true
          }

          await axPostActivity(req, activity)
        }

        await updateLotColumnFields(lot)

        const timestamp = new Date().toISOString()

        const activity = {
          activityHolderId: lot.id,
          activityHolderType: 'LOT',
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

        return res.status(201).json({
          message: 'SubLots created successfully',
          lots: savedSplittedLots
        })
      }
    } catch (err) {
      next(err)
    }
  }
)

router.put(
  '/:lotId',
  authorizationForChangeRequest(),
  async (req, res, next) => {
    /* #swagger.tags = ['Lots']
     #swagger.description = 'Endpoint to update a lot.' */
    try {
      const { lotId } = req.params
      const { unionCode } = req.locals

      const lotData = req.body

      const lot = await getLot(lotId)

      if (!lot) {
        return res.status(404).json({ message: 'Lot not found' })
      }

      if (lot.unionCode !== unionCode) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to modify this lot.' })
      }

      let isReadyForContainer = false

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
            // Check if the field's name is present as a key in lotData.fields
            // eslint-disable-next-line
            if (lotData.fields.hasOwnProperty(field?.name)) {
              // Update the value key with the corresponding value from lotData.fields
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
            ? (lot.lotStatus = 'container_created')
            : (lot.lotStatus = 'pending')

          return obj
        }
        return obj
      })

      lot.modalFieldCombined = lotModalFieldsArr

      isReadyForContainer = lotModalFieldsArr.every(
        (field) => field.columnStatus === 'DONE' || field.isOptional
      )

      lot.lotStatus = isReadyForContainer ? 'ready_for_container' : 'pending'
      lot.isReadyForContainer = isReadyForContainer

      const updatedLot = await updateLotColumnFields(lot)

      const timestamp = new Date().toISOString()

      const activity = {
        activityHolderId: lot.id,
        activityHolderType: 'LOT',
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

    const result = {
      lot,
      batches: batchArr,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr
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
