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
    // future scope features
    // eslint-disable-next-line
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
    const { productId } = req.params // TODO: not working
    const { id: userId } = req.locals

    const { farmerProduceIds, ...batchData } = req.body

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      throw new Error('Should contain farmer ids')
    }

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'BATCH'
    ) // TODO: replace it with dynamic product id

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => {
        return a.index - b.index
      }
    )

    // logic to get first column as ADD and others as NOTAPPLICABLE except the optional ones
    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (field, index) => {
        if (index === 0) {
          field.columnStatus = 'ADD'
          return field
        } else {
          field.columnStatus = field.isOptional ? 'ADD' : 'NOTAPPLICABLE'
          return field
        }
      }
    )

    // TODO: check if want to add more fields like ccCodes, type, note,
    const batch = {
      ...batchData,
      product: productId,
      deleted: false,
      isReadyForLot: false,
      batchStatus: 'ADD',
      modalFieldCombined: updatedModalFieldsArr,
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

    let isReadyForLot = false

    const findModalFieldIndex = batch.modalFieldCombined.findIndex((obj) => {
      return obj.modalFieldId === batchData.selectedModalFieldId
    })

    if (findModalFieldIndex === -1) {
      throw new Error('Invalid modal field id found')
    }

    const batchModalFieldsArr = batch.modalFieldCombined.map(
      (modalField: any, index: number) => {
        if (
          !modalField.isOptional &&
          findModalFieldIndex === batch.modalFieldCombined.length - 1 &&
          batchData.fields.finalizeBatch === true
        ) {
          // Suggestion: when modal column added/deleted, update the batch.modalFieldCombined data

          // marking batch as ready for lot when the last column is finalized
          isReadyForLot = true
        }

        if (index === findModalFieldIndex) {
          // Change Column Status to DONE if the field is finalizeBatchColumn
          modalField.columnStatus =
            batchData.fields.finalizeBatch === true ? 'DONE' : 'EDIT'
          // Iterate over each field in modalField.fields
          modalField.fields.forEach((field: any) => {
            // Check if the field's name is present as a key in batchData.fields
            if (
              Object.prototype.hasOwnProperty.call(
                batchData.fields,
                field?.name
              )
            ) {
              // Update the value key with the corresponding value from batchData.fields
              field.value = batchData.fields[field.name]
            }
          })

          return modalField
        } else if (
          // To make next column as ADD when the current column is finalized
          batchData.fields.finalizeBatch === true &&
          index === Number(findModalFieldIndex) + 1
        ) {
          // Change Next column status to ADD except the optional ones
          if (!modalField.isOptional) {
            modalField.columnStatus = 'ADD'
          }
        }

        return modalField
      }
    )

    batch.modalFieldCombined = batchModalFieldsArr

    // marking batch as ready for lot when the last column is finalized
    isReadyForLot ? (batch.isReadyForLot = true) : (batch.isReadyForLot = false)

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
