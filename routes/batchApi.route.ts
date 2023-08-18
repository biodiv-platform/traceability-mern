import { Batches } from '../models'
import {
  getBatch,
  getModalFields,
  updateBatchColumnFields,
  saveBatch,
  getFarmerProduceDetailsById,
  updateBatchIdInFarmerProduceDetails,
  saveActivity,
  authorization
} from '../services'

const router = require('express').Router()

// get request to get all lots by coCode
router.get('/all/cc', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    const { ccCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await Batches.find({
      ccCode: { $in: ccCodes.split(',').map(Number) }
    })
    res.status(200).json(BatchArr)
  } catch (err) {
    next(err)
  }
})

// post new batch

router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    // const { productId } = req.params // TODO: not working
    const { id: userId } = req.locals

    const { farmerProduceIds, ...batchData } = req.body

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      throw new Error('Should contain farmer ids')
    }

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'BATCH'
    ) // TODO: replace it with dynamic product id

    // TODO: check if want to add more fields like ccCodes, type, note,
    const batch = {
      ...batchData,
      product: productId,
      deleted: false,
      isReadyForLot: false,
      batchStatus: 'ADD',
      modalFieldCombined: modalFieldsArr.modalFieldCombined,
      farmerProduceIds
    }

    const savedBatch = await saveBatch(batch) // Saving the batch

    const { createdOn, batchId, _id: batchIdMongo }: any = savedBatch

    for (const farmerProduceId of farmerProduceIds) {
      // Update the batchId in farmer collection
      const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId)
      if (!farmerProduce) {
        throw new Error('Invalid farmer id found')
      }
      await updateBatchIdInFarmerProduceDetails(
        farmerProduceId,
        batchId,
        batchIdMongo.toString()
      )
    }

    const timestamp = createdOn || new Date().toISOString()

    const activity = {
      batchId,
      userId,
      timestamp,
      type: 'BATCH_CREATION',
      name: savedBatch.batchName,
      activityFor: 'BATCH'
    }

    await saveActivity(activity) // saves the activity log for newly created farmer record

    const result = {
      batch: savedBatch,
      farmerProduceIds
    }

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// edit batch

router.put('/:batchId', authorization('UNION'), async (req, res, next) => {
  try {
    const { batchId } = req.params
    const { id: userId } = req.locals
    const batchData = req.body

    const batch = await getBatch(batchId)
    // const batch = await getBatch("647d6c12e4d1b6c73dff8827");
    if (!batch) {
      throw new Error('Invalid batch id found')
    }

    if (batchData.fields.finalizeBatch) {
      batch.batchStatus = 'DONE'
      batch.isReadyForLot = true
    } else if (!batchData.fields.finalizeBatch) {
      batch.batchStatus = 'EDIT'
      batch.isReadyForLot = false
    }

    const findModalFieldIndex = batch.modalFieldCombined.findIndex((obj) => {
      return obj.modalFieldId == batchData.selectedModalFieldId
    })

    if (findModalFieldIndex === -1) {
      throw new Error('Invalid modal field id found')
    }

    const batchModalFieldsArr = batch.modalFieldCombined.map((obj, index) => {
      if (index === findModalFieldIndex) {
        // Iterate over each field in obj.fields
        obj.fields.forEach((field) => {
          // Check if the field's name is present as a key in batchData.fields
          if (batchData.fields.hasOwnProperty(field?.name)) {
            // Update the value key with the corresponding value from batchData.fields
            field.value = batchData.fields[field.name]
          }
        })

        // Return the updated obj
        return obj
      }
      return obj
    })

    batch.modalFieldCombined = batchModalFieldsArr

    const updatedBatch = await updateBatchColumnFields(batch)

    const timestamp = new Date().toISOString()

    //  TODO: check if activity is updating correctly
    const activity = {
      batchId,
      userId,
      timestamp,
      type: 'BATCH_UPDATE',
      name: updatedBatch.batchName,
      activityFor: 'BATCH'
    }

    await saveActivity(activity) // saves the activity log for editing a batch

    res.status(200).json(updatedBatch)
  } catch (err) {
    next(err)
  }
})

module.exports = router
