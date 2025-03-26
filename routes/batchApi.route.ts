import { SITE_CONFIG } from '../static/constants'
import { Batches } from '../models'
import {
  getBatch,
  getModalFields,
  updateBatchColumnFields,
  saveBatch,
  getFarmerProduceDetailsById,
  updateBatchIdInFarmerProduceDetails,
  authorization,
  getFarmerProduceDetailsByBatchId,
  getlistData,
  getAggregations,
  getBatchFarmersAndProduce,
  axPostActivity,
  authorizationForChangeRequest
} from '../services'
import { FIELD_TYPES } from '../utils/schema'
import { BATCH_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'

const router = require('express').Router()

router.get('/all/coCodes', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Batches']
     #swagger.description = 'Endpoint to get all batch coCodes.' */
  try {
    const batchData = await getlistData(req, Batches, BATCH_PRE_DEFINED_FIELDS)
    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/BatchList" },
       description: "List of all batch coCodes." } */
    res.status(200).json(batchData)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Batches']
       #swagger.description = 'Endpoint to get aggregated batch data.' */
    try {
      const aggregationFields = {
        isReadyForLot: FIELD_TYPES.BOOLEAN,
        type: FIELD_TYPES.GROUPANDCOUNT,
        batchStatus: FIELD_TYPES.GROUPANDCOUNT,
        quantity: FIELD_TYPES.MINMAX
      }

      const aggregationData = await getAggregations(
        req,
        Batches,
        aggregationFields
      )
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/BatchAggregation" },
         description: "Aggregated batch data." } */
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/:batchId/farmerProduce',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Batches']
       #swagger.description = 'Endpoint to get farmer produce details for a specific batch.' */
    try {
      const { batchId } = req.params
      const farmerProduceArr = await getFarmerProduceDetailsByBatchId(batchId)
      /* #swagger.responses[200] = {
         schema: { "$ref": "#/definitions/FarmerProduceList" },
         description: "List of farmer produce details for the specified batch." } */
      res.status(200).json(farmerProduceArr)
    } catch (err) {
      next(err)
    }
  }
)

router.get('/show/:batchId', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Batches']
     #swagger.description = 'Endpoint to get batch show page details.' */
  try {
    const { batchId } = req.params
    const batch = await getBatch(batchId)
    if (!batch) {
      throw new Error('Invalid lot id found')
    }

    const { farmerArr, farmerLocationArr, farmerProduceArr } =
      await getBatchFarmersAndProduce(batch)

    // TODO: add batch activity here

    const result = {
      batch,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr
    }

    /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Batch" },
       description: "Batch show page details." } */
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/new', authorizationForChangeRequest(), async (req, res, next) => {
  /* #swagger.tags = ['Batches']
     #swagger.description = 'Endpoint to create a new batch.' */
  try {
    const { productId } = req.params // TODO: not working
    const { id: userId, unionCode } = req.locals

    const { farmerProduceIds, type: batchType, ...batchData } = req.body

    let isReadyForLot = false

    if (batchData.unionCode !== unionCode) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      res.status(400).json({ error: 'Farmer ids are required to create batch' })
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

    const batch = {
      ...batchData,
      product: productId,
      isDeleted: false,
      isReadyForLot,
      batchStatus: isReadyForLot ? 'Ready for lot' : 'Pending',
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
      // update produce status
      const produceStatus = 'Batch created'
      await updateBatchIdInFarmerProduceDetails(
        farmerProduceId,
        batchId,
        batchIdMongo.toString(),
        produceStatus
      )
    }

    const activity = {
      activityHolderId: savedBatch.id,
      activityHolderType: 'BATCH',
      authorId: userId,
      activityType: 'BATCH_CREATION',
      rootHolderId: savedBatch.id,
      rootHolderType: 'content.eml.Batch',
      subRootHolderId: savedBatch.id,
      subRootHolderType: 'content.eml.Batch',
      activityDescription: `Batch: ${savedBatch.batchName} created`,
      isShowable: true
    }

    await axPostActivity(req, activity)

    const result = {
      batch: savedBatch,
      farmerProduceIds
    }

    /* #swagger.responses[201] = {
       schema: { "$ref": "#/definitions/Batch" },
       description: "Created batch with farmer produce details." } */
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.put(
  '/:batchId',
  authorizationForChangeRequest(),
  async (req, res, next) => {
    /* #swagger.tags = ['Batches']
     #swagger.description = 'Endpoint to update a batch.' */
    try {
      const { batchId } = req.params
      const { id: userId, unionCode } = req.locals
      const batchData = req.body

      const batch = await getBatch(batchId)
      // const batch = await getBatch("647d6c12e4d1b6c73dff8827");
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' })
      }

      if (batch.unionCode !== unionCode) {
        return res.status(403).json({ error: 'Unauthorized' })
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
      isReadyForLot
        ? (batch.isReadyForLot = true)
        : (batch.isReadyForLot = false)

      batch.batchStatus = isReadyForLot ? 'Ready for lot' : 'Pending'

      const updatedBatch = await updateBatchColumnFields(batch)

      //  TODO: Add more details in activityDescription
      const activity = {
        activityHolderId: batch.id,
        activityHolderType: 'BATCH',
        authorId: userId,
        activityType: 'BATCH_UPDATE',
        rootHolderId: batch.id,
        rootHolderType: 'content.eml.Batch',
        subRootHolderId: batch.id,
        subRootHolderType: 'content.eml.Batch',
        activityDescription: null,
        isShowable: true
      }

      await axPostActivity(req, activity)

      /* #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Batch" },
       description: "Updated batch with farmer produce details." } */
      res.status(200).json(updatedBatch)
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
