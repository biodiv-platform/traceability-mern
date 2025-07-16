import type { Request, Response, NextFunction } from 'express'
import { type IContainer } from '../interfaces/traceability'
import logger from '../utils/logger'
import { Container } from '../models'
import { CONTAINER_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { FIELD_TYPES } from '../utils/schema'
import {
  getContainerDetails,
  saveNewContainer,
  updateContainer as updateContainerService,
  getAssociatedLots,
  getlistData,
  getAggregations
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
    const { containerData, usedLots } = req.body

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

    const lotIds = usedLots.map((lot: { _id: string }) => lot._id)
    const container: Partial<IContainer> = {
      ...containerData,
      product: '645774053e1875e3bd793978', // TODO: remove hardcoding
      containerStatus: containerData.isReadyToSold
        ? 'container_sold'
        : 'at_co_operative',
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
