import type { Request, Response, NextFunction } from 'express'
import { type ILot, type IContainer } from '../interfaces/traceability'
import logger from '../utils/logger'
import { Container, Lots } from '../models'
import { CONTAINER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { FIELD_TYPES } from '../utils/schema'
import {
  getContainerDetails,
  saveNewContainer,
  updateContainer as updateContainerService,
  getAssociatedLots,
  getlistData,
  getAggregations,
  saveLot,
  axPostActivity
} from '../services'

/**
 * Get container codes with pagination and filtering
 */
export const getContainerCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
}

/**
 * Get aggregated container data
 */
export const getContainerAggregation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

/**
 * Get detailed container information
 */
export const getContainerDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { containerId } = req.params
    const result = await getContainerDetails(containerId)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Create a new container
 */
export const createContainer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { unionCodes } = req.locals
    const { containerData, usedLots, remainingLots } = req.body

    // Validate inputs
    logger.debug(
      `Validating unionCode: ${containerData.unionCode} vs ${unionCodes}`
    )
    if (!unionCodes.includes(Number(containerData.unionCode))) {
      logger.warn(
        `Unauthorized container creation attempt for union ${containerData.unionCode}`
      )
      res.status(403).json({
        message: 'You are not authorized to create this container.'
      })
      return
    }

    if (!usedLots?.length) {
      res.status(400).json({
        message: 'Container should contain at least one lot'
      })
      return
    }

    let lotIds = []

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
              amountPaidCalculate: null,
              // should we update the lot category here?
              lastUpdatedAt: new Date()
            })

            const newLotData: ILot = {
              ...JSON.parse(JSON.stringify(originalLot)),
              lotId: `${originalLot.lotId}_RM`,
              lotName: `${originalLot.lotName}_RM`,
              quantity: remainingLot.quantity,
              amountPaidCalculate: null,
              lotStatus: 'ready_for_container',
              lotCategory: 'remaining_lot',
              isReadyForContainer: true,
              createdAt: new Date(),
              lastUpdatedAt: new Date()
            }

            delete newLotData._id
            delete newLotData.id

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

    const container: Partial<IContainer> = {
      ...containerData,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      isDeleted: false,
      lotIds,
      flag: false,
      flagReason: []
    }

    logger.debug(`Creating container with ${lotIds.length} lots`)
    const result = await saveNewContainer(container as IContainer, lotIds)
    logger.info(
      `Created container ${result.container._id} with lots: ${lotIds.join(
        ', '
      )}`
    )
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Update container information
 */
export const updateContainer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { containerId } = req.params
    const { unionCodes } = req.locals
    const containerData = req.body

    // Verify container exists and check authorization
    const existingContainer = await Container.findById(containerId)
    if (!existingContainer) {
      res.status(404).json({ message: 'Container not found' })
      return
    }

    logger.debug(
      `Validating update unionCode: ${existingContainer.unionCode} vs ${unionCodes}`
    )
    if (!unionCodes.includes(Number(existingContainer.unionCode))) {
      logger.warn(
        `Unauthorized container update attempt for union ${existingContainer.unionCode}`
      )
      res.status(403).json({
        message: 'You are not authorized to modify this container.'
      })
      return
    }

    const updatedContainer = await updateContainerService(
      containerId,
      containerData
    )
    res.status(200).json(updatedContainer)
  } catch (err) {
    next(err)
  }
}

/**
 * Get container lots
 */
export const getContainerLots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { containerId } = req.query

    if (!containerId) {
      res.status(400).json({ message: 'Container IDs are required' })
      return
    }

    const containerIdsArray = Array.isArray(containerId)
      ? containerId
      : [containerId]

    const lots = await getAssociatedLots(containerIdsArray)
    res.status(200).json(lots)
  } catch (err) {
    next(err)
  }
}
