import { Container } from '../models'
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
  getAllFarmerLocations
} from '../services'
import { FIELD_TYPES } from '../utils/schema'
import { CONTAINER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'

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

router.post('/new', authorization('UNION'), async (req, res, next) => {
  /* #swagger.tags = ['Container']
     #swagger.description = 'Create a new container with associated lots.'
     #swagger.parameters['body'] = {
       in: 'body',
       description: 'Container data',
       required: true,
       schema: {
         type: 'object',
         required: ['lotIds', 'containerName'],
         properties: {
           containerName: {
             type: 'string',
             description: 'Name of the container'
           },
           lotIds: {
             type: 'array',
             items: {
               type: 'string'
             },
             description: 'Array of lot IDs to be associated with the container'
           }
         }
       }
     }
     #swagger.responses[201] = {
       schema: { "$ref": "#/definitions/Container" },
       description: "Container successfully created"
     }
     #swagger.responses[400] = {
       description: "Invalid input data"
     }
     #swagger.responses[401] = {
       description: "Unauthorized"
     }
     #swagger.responses[500] = {
       description: "Internal server error"
     }
  */
  try {
    const { productId } = req.params
    const { id: userId } = req.locals

    // TODO: add security check for union permission for the container

    const { lotIds, ...containerData } = req.body

    if (!lotIds || lotIds.length === 0) {
      throw new Error('Should contain batch ids')
    }

    // add if modal fields exist for container

    const container = {
      ...containerData,
      productId,
      containerStatus: 'at_co_operative',
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
      authorId: userId,
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
  '/update/:containerId',
  authorization('UNION'),
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
      const { id: userId } = req.locals

      const container = await getContainer(containerId)
      if (!container) {
        throw new Error('Invalid container id found')
      }

      const { lotIds, ...containerData } = req.body

      const updatedContainer = await Container.findByIdAndUpdate(
        containerId,
        containerData,
        {
          new: true,
          runValidators: true
        }
      ).exec()

      const result = {
        container: updatedContainer,
        lots: lotIds
      }

      const activity = {
        activityHolderId: container.id,
        activityHolderType: 'CONTAINER',
        authorId: userId,
        activityType: 'CONTAINER_UPDATE',
        rootHolderId: container.id,
        rootHolderType: 'content.eml.Container',
        subRootHolderId: container.id,
        subRootHolderType: 'content.eml.Container',
        activityDescription: `Container: ${container.containerName} updated.`,
        isShowable: true
      }

      await axPostActivity(req, activity)

      res.status(200).json(result)
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
