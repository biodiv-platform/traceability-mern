import { LOCATION_TYPE } from '../static/constants'
import { Lots } from '../models'

import {
  getLot,
  getBatchesByBatchIds,
  saveLot,
  getBatch,
  updateFarmerProduceIdsInLot,
  updateBatchLotId,
  saveActivity,
  authorization,
  getModalFields,
  updateLotColumnFields,
  deleteAllBatches,
  deleteAllLots,
  getFarmerProduceDetailsById,
  getFarmerDetailsBySubmissionUUID,
  getActivitiesByHolderId
} from '../services'
const router = require('express').Router()

// get request to get all lots by coCode
router.get('/all/coCodes', authorization('UNION'), async (req, res, next) => {
  try {
    // disable eslint for future scope
    // eslint-disable-next-line
    const { coCodes, limit, offset } = req.query
    // TODO: handle pagination
    const lotInfo = await Lots.find({
      coCode: { $in: coCodes.split(',').map(Number) },
      lotStatus: { $exists: true } // TODO: do we need this?
    })
    res.status(200).json(lotInfo)
  } catch (err) {
    next(err)
  }
})

//  post request to create a lot
router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    const { productId } = req.params // TODO: not working
    const { id: userId } = req.locals

    const { batchIds, ...lotData } = req.body

    if (!batchIds || batchIds.length === 0) {
      throw new Error('Should contain batch ids')
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
      const { farmerProduceIds } = await updateBatchLotId(
        batchId,
        lotId.toString(),
        savedLot._id.toString(),
        lotStatus
      )
      farmerProduceIdsArr.push(...farmerProduceIds)
    }

    const updatedLotWithFarmerProduceIds = await updateFarmerProduceIdsInLot(
      savedLot._id,
      farmerProduceIdsArr
    )

    // Add activity of lot creation
    const timestamp = createdAt || new Date().toISOString()
    const activity = {
      activityHolderId: savedLot._id,
      activityHolderType: 'LOT',
      authorId: userId,
      dateCreated: timestamp,
      activityType: 'LOT_CREATION',
      activityDescription: `Lot: ${lot.lotName} created.`
    }

    await saveActivity(activity)

    const result = {
      lot: updatedLotWithFarmerProduceIds,
      batches: batchIds
    }
    res.status(201).json(result)
  } catch (err) {
    next(err)
    // TODO: handle pagination
  }
})

// update lot modalFields
router.put('/:lotId', authorization('UNION'), async (req, res, next) => {
  try {
    const { lotId } = req.params

    const { id: userId } = req.locals

    const lotData = req.body

    const lot = await getLot(lotId)

    if (!lot) {
      throw new Error('Invalid batch id found')
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
      activityHolderId: lot._id,
      activityHolderType: 'LOT',
      authorId: userId,
      dateCreated: timestamp,
      activityType: 'LOT_UPDATE',
      activityDescription: `${lotData.columnName} column updated.`
    }

    await saveActivity(activity)

    res.status(200).json(updatedLot)
  } catch (err) {
    next(err)
  }
})

// get request to get all batches by lotId
router.get('/batches', authorization('UNION'), async (req, res, next) => {
  try {
    const { lotId } = req.query
    const lot = await getLot(lotId)
    if (!lot) {
      throw new Error('Invalid lot id found')
    }
    const { batchIds } = lot

    const batches = await getBatchesByBatchIds(batchIds)
    res.status(200).json(batches)
  } catch (err) {
    next(err)
  }
})

router.get('/show/:lotId', authorization('UNION'), async (req, res, next) => {
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
        farmerArr.push(farmer)

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

    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.delete('/deleteAll', async (req, res, next) => {
  try {
    const result = await deleteAllBatches()
    const result2 = await deleteAllLots()
    res.status(200).json({ result, result2 })
  } catch (err) {
    next(err)
  }
})

module.exports = router
