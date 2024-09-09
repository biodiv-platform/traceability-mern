import { SITE_CONFIG } from '../static/constants'
import { Batches } from '../models'
import {
  getBatch,
  getModalFields,
  updateBatchColumnFields,
  saveBatch,
  getFarmerProduceDetailsById,
  updateBatchIdInFarmerProduceDetails,
  saveActivity,
  authorization,
  getFarmerProduceDetailsByBatchId
} from '../services'

const router = require('express').Router()

// get request to get all lots by coCode
router.get('/all/cc', authorization('UNION'), async (req, res, next) => {
  // TODO: check if union permission is required
  try {
    // future scope features
    // eslint-disable-next-line
    const { coCodes, limit, offset } = req.query
    // TODO: handle pagination
    const BatchArr = await Batches.find({
      coCode: { $in: coCodes.split(',').map(Number) }
    })
    res.status(200).json(BatchArr)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/:batchId/farmerProduce',
  authorization('UNION'),
  async (req, res, next) => {
    try {
      const { batchId } = req.params
      const farmerProduceArr = await getFarmerProduceDetailsByBatchId(batchId)
      res.status(200).json(farmerProduceArr)
    } catch (err) {
      next(err)
    }
  }
)

// post new batch

router.post('/new', authorization('UNION'), async (req, res, next) => {
  try {
    const { productId } = req.params // TODO: not working
    const { id: userId } = req.locals

    const { farmerProduceIds, type: batchType, ...batchData } = req.body

    let isReadyForLot = false

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      throw new Error('Should contain farmer ids')
    }

    const modalFieldsArr = await getModalFields(
      SITE_CONFIG.ROBUSTA_COFFEE_PRODUCT_ID,
      'BATCH'
    ) // TODO: replace it with dynamic product id

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => {
        return a.index - b.index
      }
    )

    // logic to get first column as ADD and others as NOTAPPLICABLE except the optional and not fulfilling scope columns
    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (field, index) => {
        // Check if scope is non-empty
        const isScopeNonEmpty = Object.keys(field?.scope).length !== 0
        // Evaluate if the current scope meets the required criteria
        const isScopeCriteriaMet =
          isScopeNonEmpty && field.scope?.type.includes(batchType.toUpperCase())

        // if you have other criteria like batch quantity, etc. then add here

        // Decide the columnStatus based on the scope criteria being met
        if (index === 0 || field.isOptional) {
          field.columnStatus = isScopeCriteriaMet ? 'ADD' : 'NOTAPPLICABLE'
        } else {
          if (isScopeNonEmpty) {
            field.columnStatus = isScopeCriteriaMet ? 'ADD' : 'NOTAPPLICABLE'
          } else {
            field.columnStatus = 'ADD'
          }
        }

        return field
      }
    )

    // if there are no mandatory fields, then the batch is ready for lot or if all the fields are optional or not applicable
    isReadyForLot =
      updatedModalFieldsArr.length === 0 ||
      updatedModalFieldsArr.every(
        (field) =>
          field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
      )

    // TODO: check if want to add more fields like ccCodes, type, note,
    const batch = {
      ...batchData,
      product: productId,
      isDeleted: false,
      isReadyForLot,
      batchStatus: 'ADD',
      type: batchType,
      modalFieldCombined: updatedModalFieldsArr,
      farmerProduceIds,
      flag: false,
      flagReason: []
    }

    const savedBatch = await saveBatch(batch) // Saving the batch

    const {
      createdAt,
      batchId,
      _id: batchIdMongo
    }: {
      createdAt: Date
      batchId: string
      _id: string
    } = savedBatch

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

    const timestamp = createdAt || new Date().toISOString()

    const activity = {
      activityHolderId: savedBatch._id,
      activityHolderType: 'BATCH',
      authorId: userId,
      dateCreated: timestamp,
      activityType: 'BATCH_CREATION',
      activityDescription: `Batch: ${savedBatch.batchName} created`
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

    //  TODO: Add more details in activityDescription
    const activity = {
      activityHolderId: batch._id,
      activityHolderType: 'BATCH',
      authorId: userId,
      dateCreated: timestamp,
      activityType: 'BATCH_UPDATE',
      activityDescription: null
    }

    await saveActivity(activity) // saves the activity log for editing a batch

    res.status(200).json(updatedBatch)
  } catch (err) {
    next(err)
  }
})

module.exports = router
