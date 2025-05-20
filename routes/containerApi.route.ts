import { Container } from '../models'
import { Lots } from '../models'

import {
  authorization,
  getlistData,
  axPostActivity,
  getLot,
  saveContainer,
  updateLotBatchAndFarmerProduceIdsInContainer,
  getContainer,
  getLots,
  getBatches,
  getFarmerProduce,
  updateContainerIdInLots,
  getAggregations,
  getLotsByLotIds,
  getAllFarmerLocations,
  getModalFields,
  authorizationForChangeRequest,
  saveLot
} from '../services'
import { FIELD_TYPES } from '../utils/schema'
import { CONTAINER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { CONTAINER_FIELD_UPDATE_RULES } from '../static/constants'
import { ILot } from 'interfaces/traceability'

const router = require('express').Router()

router.get('/all/coCodes', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Container']
     #swagger.description = 'Get all container codes with pagination and filtering.'
     #swagger.parameters['page'] = {
       in: 'query',
       description: 'Page number for pagination',
       type: 'integer',
       default: 1
     }
     #swagger.parameters['limit'] = {
       in: 'query',
       description: 'Number of items per page',
       type: 'integer',
       default: 10
     }
     #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/ContainerList" },
       description: "Successfully retrieved container list"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
  try {
    const containerData = await getlistData(
      req,
      Container,
      CONTAINER_PRE_DEFINED_FIELDS
    )
    res.status(200).json(containerData)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/aggregation/all',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Container']
     #swagger.description = 'Get aggregated container data including type, quantity, and status counts.'
     #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/ContainerAggregation" },
       description: "Successfully retrieved aggregated container data"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
    try {
      const aggregationFields = {
        type: FIELD_TYPES.GROUPANDCOUNT,
        quantity: FIELD_TYPES.MINMAX,
        containerStatus: FIELD_TYPES.GROUPANDCOUNT
      }

      const aggregationData = await getAggregations(
        req,
        Container,
        aggregationFields
      )
      res.status(200).json({ aggregationData })
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/show/:containerId',
  authorization('UNION'),
  async (req, res, next) => {
    /* #swagger.tags = ['Container']
     #swagger.description = 'Get detailed information about a specific container including associated lots, batches, and farmer details.'
     #swagger.parameters['containerId'] = {
       in: 'path',
       description: 'ID of the container to retrieve',
       required: true,
       type: 'string'
     }
     #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Container" },
       description: "Successfully retrieved container details"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[404] = {
       description: "Container not found"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
    try {
      const { containerId } = req.params
      const container = await getContainer(containerId)
      if (!container) {
        throw new Error('Invalid lot id found')
      }

      const lots = await getLots(container.lotIds)
      const batches = await getBatches(container.batchIds)
      const farmerProduceArr = await getFarmerProduce(
        container.farmerProduceIds
      )
      const { farmerArr, farmerLocationArr } = await getAllFarmerLocations(
        farmerProduceArr
      )

      const result = {
        container,
        lotArr: lots,
        batches,
        farmerProduceArr,
        farmerArr,
        farmerLocationArr
      }

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
)

router.post('/new', authorizationForChangeRequest(), async (req, res, next) => {
  /* #swagger.tags = ['Container']
     #swagger.description = 'Create a new container with associated lots.'
     #swagger.parameters['body'] = {
       in: 'body',
       description: 'Container data with used and remaining lots',
       required: true,
       schema: {
         type: 'object',
         required: ['containerData', 'usedLots'],
         properties: {
           containerData: {
             type: 'object',
             description: 'Container data',
             properties: {
               containerName: { type: 'string' },
               type: { type: 'string' },
               coCode: { type: 'array', items: { type: 'number' } },
               ccCode: { type: 'array', items: { type: 'number' } },
               unionCode: { type: 'number' },
               quantity: { type: 'number' },
               createdOn: { type: 'number' },
               note: { type: 'string' }
             }
           },
           usedLots: {
             type: 'array',
             items: {
               type: 'object'
             },
             description: 'Array of lots with adjusted quantities to be used in container'
           },
           remainingLots: {
             type: 'array',
             items: {
               type: 'object'
             },
             description: 'Array of remaining lot portions to be created as new lots'
           }
         }
       }
     }
     #swagger.responses[201] = {
       schema: { "$ref": "#/definitions/Container" },
       description: "Container successfully created"
     }
  */
  try {
    const { productId } = req.params
    const { unionCode } = req.locals
    const { containerData, usedLots, remainingLots } = req.body

    if (containerData.unionCode !== unionCode) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to create this container.' })
    }

    if (!usedLots || usedLots.length === 0) {
      return res
        .status(400)
        .json({ message: 'Container should contain at least one lot' })
    }

    let lotIds = []
    let isReadyToSold = false

    try {
      if (!remainingLots || remainingLots.length === 0) {
        lotIds = usedLots.map((lot) => lot._id)
      } else {
        for (const usedLot of usedLots) {
          const originalLot = await Lots.findById(usedLot._id)
          if (!originalLot) {
            throw new Error(`Invalid lot id found: ${usedLot._id}`)
          }

          const remainingLot = remainingLots.find(
            (rlot) => rlot._id === usedLot._id
          )

          if (remainingLot) {
            await Lots.findByIdAndUpdate(usedLot._id, {
              quantity: usedLot.quantity,
              // should we update the lot category here?
              lastUpdatedAt: new Date()
            })

            const newLotData: ILot = {
              ...JSON.parse(JSON.stringify(originalLot)),
              lotName: `${originalLot.lotName}`,
              quantity: remainingLot.quantity,
              lotStatus: 'ready_for_container',
              lotCategory: 'remaining_lot',
              isReadyForContainer: true,
              createdAt: new Date(),
              lastUpdatedAt: new Date()
            }

            delete newLotData._id

            const savedLot = await saveLot(newLotData)

            const activity = {
              activityHolderId: savedLot.id,
              activityHolderType: 'LOT',
              activityType: 'LOT_CREATION',
              rootHolderId: savedLot.id,
              rootHolderType: 'content.eml.Lot',
              subRootHolderId: savedLot.id,
              subRootHolderType: 'content.eml.Lot',
              activityDescription: `Lot: ${savedLot.lotName} created.`,
              isShowable: true
            }

            await axPostActivity(req, activity)
          }

          lotIds.push(usedLot._id)
        }
      }
    } catch (error) {
      return res.status(500).json({ message: 'Error processing lots', error })
    }

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'CONTAINER'
    ) // TODO: replace with dynamic productId

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => a.index - b.index
    )

    sortedModalFieldsArrByIndex.forEach((modalFieldsArr) => {
      const fieldRules = CONTAINER_FIELD_UPDATE_RULES[modalFieldsArr.columnName]
      if (fieldRules) {
        modalFieldsArr.fields.forEach((field) => {
          if (fieldRules[field.name]) {
            field.value = fieldRules[field.name](containerData)
          }
        })
      }
    })

    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (obj, index, arr) => {
        if (index === 0 && obj.isOptional) {
          obj.columnStatus = 'ADD'
          const nextNonOptionalIndex = arr.findIndex(
            (item, i) => i > index && !item.isOptional
          )
          if (nextNonOptionalIndex !== -1) {
            arr[nextNonOptionalIndex].columnStatus = 'ADD'
          }
          return obj
        }

        if (index === 0) {
          obj.columnStatus = 'ADD'
          return obj
        }

        if (obj.columnStatus === 'ADD') {
          return obj
        }

        if (obj.isOptional) {
          obj.columnStatus = 'ADD'
          return obj
        }

        obj.columnStatus = 'NOTAPPLICABLE'
        return obj
      }
    )

    isReadyToSold =
      updatedModalFieldsArr.length === 0 ||
      updatedModalFieldsArr.every(
        (field) =>
          field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
      )

    const container = {
      ...containerData,
      productId,
      containerStatus: isReadyToSold ? 'container_sold' : 'at_co_operative',
      modalFieldCombined: updatedModalFieldsArr,
      isDeleted: false,
      lotIds,
      flag: false,
      flagReason: []
    }

    const savedContainer = await saveContainer(container)

    const farmerProduceIdsArr = []
    const batchIdArr = []

    for (const lotId of lotIds) {
      const lot = await getLot(lotId)
      if (!lot) {
        throw new Error('Invalid lot id found')
      }
      batchIdArr.push(...lot.batchIds)
      farmerProduceIdsArr.push(...lot.farmerProduceIds)
    }

    const updatedContainer = await updateLotBatchAndFarmerProduceIdsInContainer(
      savedContainer._id,
      lotIds,
      batchIdArr,
      farmerProduceIdsArr
    )

    await updateContainerIdInLots(
      lotIds,
      savedContainer._id,
      true,
      'container_created'
    )

    const activity = {
      activityHolderId: savedContainer.id,
      activityHolderType: 'CONTAINER',
      activityType: 'CONTAINER_CREATION',
      rootHolderId: savedContainer.id,
      rootHolderType: 'content.eml.Container',
      subRootHolderId: savedContainer.id,
      subRootHolderType: 'content.eml.Container',
      activityDescription: `Container: ${container.containerName} created.`,
      isShowable: true
    }

    await axPostActivity(req, activity)

    const result = {
      container: updatedContainer,
      lots: lotIds
    }
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.put(
  '/:containerId',
  authorizationForChangeRequest(),
  async (req, res, next) => {
    /* #swagger.tags = ['Container']
     #swagger.description = 'Update an existing container.'
     #swagger.parameters['containerId'] = {
       in: 'path',
       description: 'ID of the container to update',
       required: true,
       type: 'string'
     }
     #swagger.parameters['body'] = {
       in: 'body',
       description: 'Updated container data',
       required: true,
       schema: {
         type: 'object',
         properties: {
           containerName: {
             type: 'string',
             description: 'Updated name of the container'
           },
           containerStatus: {
             type: 'string',
             description: 'Updated status of the container'
           }
         }
       }
     }
     #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/Container" },
       description: "Container successfully updated"
     }
     #swagger.responses[400] = {
       description: "Invalid input data"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[404] = {
       description: "Container not found"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
    try {
      const { containerId } = req.params
      const { unionCode } = req.locals

      const containerData = req.body

      const container = await getContainer(containerId)
      if (!container) {
        return res.status(404).json({ message: 'Container not found' })
      }

      if (container.unionCode !== unionCode) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to modify this container.' })
      }

      let isReadyToSold = false

      const findModalFieldIndex = container.modalFieldCombined.findIndex(
        (modalField) => {
          return modalField.modalFieldId === containerData.selectedModalFieldId
        }
      )

      const containerModalFieldsArr = container.modalFieldCombined.map(
        (obj, index) => {
          if (index === findModalFieldIndex) {
            // Change Column Status to DONE if the field is finalizeBatchColumn
            obj.columnStatus = containerData.fields.finalizeContainerColumn
              ? 'DONE'
              : 'EDIT'
            // Iterate over each field in obj.fields
            obj.fields.forEach((field) => {
              // Check if the field's name is present as a key in batchData.fields
              // eslint-disable-next-line
              if (containerData.fields.hasOwnProperty(field?.name)) {
                // Update the value key with the corresponding value from batchData.fields
                field.value = containerData.fields[field.name]
              }
            })
            // Update lastUpdatedAt with current timestamp
            obj.lastUpdatedAt = new Date().toISOString()
            return obj
          } else if (
            containerData.fields.finalizeContainerColumn &&
            index === Number(findModalFieldIndex) + 1
          ) {
            // Change Next column status to ADD except the optional ones
            if (!obj.isOptional) {
              obj.columnStatus = 'ADD'
            }

            // update container Status
            // TODO: revisit the logic
            index === container.modalFieldCombined.length - 1 && !obj.isOptional
              ? (container.containerStatus = 'container_sold')
              : (container.containerStatus = 'pending')

            return obj
          }
          return obj
        }
      )

      container.modalFieldCombined = containerModalFieldsArr

      isReadyToSold = containerModalFieldsArr.every(
        (field) => field.columnStatus === 'DONE' || field.isOptional
      )

      container.containerStatus = isReadyToSold ? 'container_sold' : 'pending'
      container.isReadyToSold = isReadyToSold

      const updatedContainer = await Container.findByIdAndUpdate(
        container._id,
        {
          containerStatus: container.containerStatus,
          isReadyToSold: container.isReadyToSold,
          modalFieldCombined: container.modalFieldCombined
        },
        {
          new: true,
          runValidators: true
        }
      ).exec()

      const activity = {
        activityHolderId: container.id,
        activityHolderType: 'CONTAINER',
        activityType: 'CONTAINER_UPDATE',
        rootHolderId: container.id,
        rootHolderType: 'content.eml.Container',
        subRootHolderId: container.id,
        subRootHolderType: 'content.eml.Container',
        activityDescription: `Container: ${container.containerName} updated.`,
        isShowable: true
      }

      await axPostActivity(req, activity)

      res.status(200).json(updatedContainer)
    } catch (err) {
      next(err)
    }
  }
)

router.get('/lots', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Container']
     #swagger.description = 'Get all lots associated with a specific container.'
     #swagger.parameters['containerId'] = {
       in: 'query',
       description: 'ID of the container to get lots for',
       required: true,
       type: 'string'
     }
     #swagger.responses[200] = {
       schema: { "$ref": "#/definitions/LotList" },
       description: "Successfully retrieved lots"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[404] = {
       description: "Container not found"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
  try {
    const { containerId } = req.query
    const container = await getContainer(containerId)
    if (!container) {
      throw new Error('Invalid container id found')
    }
    const { lotIds } = container

    const lots = await getLotsByLotIds(lotIds)
    res.status(200).json(lots)
  } catch (err) {
    next(err)
  }
})

module.exports = router
