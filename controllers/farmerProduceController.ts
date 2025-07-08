import type { Request, Response, NextFunction } from 'express'
import { FARMER_PRODUCE_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { FIELD_TYPES } from '../utils/schema'
import logger from '../utils/logger'
import { saveLogToFile, formatTimeStampFromUTC } from '../utils'
import {
  getFarmerProduceDetailsById,
  getFarmerDetailsByFarmerId,
  postFarmerProduceDetail,
  updateFarmerCollection,
  axPostActivity
} from '../services'
import * as farmerProduceService from '../services/farmerProduceService'

/**
 * Get all farmer produce with pagination and filtering
 */
export const getAllFarmerProduce = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmerProduceData = await farmerProduceService.getAllFarmerProduce(
      req,
      FARMER_PRODUCE_PRE_DEFINED_FIELDS
    )
    res.status(200).json(farmerProduceData)
  } catch (err) {
    next(err)
  }
}

/**
 * Get aggregated farmer produce data
 */
export const getFarmerProduceAggregation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aggregationFields = {
      produceType: FIELD_TYPES.GROUPANDCOUNT,
      quantity: FIELD_TYPES.MINMAX,
      deductionReason: FIELD_TYPES.GROUPANDCOUNT,
      noOfBags: FIELD_TYPES.MINMAX,
      deduction: FIELD_TYPES.MINMAX,
      netCollection: FIELD_TYPES.MINMAX,
      pricePerKg: FIELD_TYPES.MINMAX,
      amountPaidCalculate: FIELD_TYPES.MINMAX,
      millingCharge: FIELD_TYPES.MINMAX,
      collectorName: FIELD_TYPES.GROUPANDCOUNT,
      collectorSubstr: FIELD_TYPES.GROUPANDCOUNT,
      calculateGrn: FIELD_TYPES.GROUPANDCOUNT,
      produceStatus: FIELD_TYPES.GROUPANDCOUNT
    }
    const aggregationData =
      await farmerProduceService.getFarmerProduceAggregation(
        req,
        aggregationFields
      )
    res.status(200).json({ aggregationData })
  } catch (err) {
    next(err)
  }
}

/**
 * Fetch farmer produce data from ODK via CRON job
 */
export const fetchFarmerProduceFromODKCron = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const results = await farmerProduceService.fetchFarmerProduceFromODKCron(
      req
    )
    res.status(200).json({ results })
  } catch (err) {
    const errorMessage = `Error in Fetching Farmer Produce From ODK. Error: ${err.message}`
    res.status(500).json({ message: errorMessage })
    logger.error({
      method: req.method,
      stack: err.stack,
      message: errorMessage
    })
    saveLogToFile(errorMessage, 'fetchFarmerProduceFromODKAPI', true)
    next(err)
  }
}

/**
 * Fetch farmer produce data from ODK on demand
 */
export const fetchFarmerProduceFromODKOnDemand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.query

    if (!key) {
      res.status(400).json({ message: 'Key is required' })
      return
    }

    try {
      const result =
        await farmerProduceService.fetchFarmerProduceFromODKOnDemand(
          req,
          key as string
        )
      saveLogToFile(result, 'fetchFarmerProduceFromODKAPI')
      res.status(200).json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'Data is undefined') {
        res.status(500).json({ message: 'Data is undefined' })
        return
      }
      throw error
    }
  } catch (err) {
    next(err)
  }
}

/**
 * Get specific farmer produce details by ID
 */
export const getFarmerProduceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerProduceId } = req.params

    const farmerProduceArr = await getFarmerProduceDetailsById(farmerProduceId)
    if (!farmerProduceArr) {
      throw new Error('Invalid farmerProduce id found')
    }

    const farmer = await getFarmerDetailsByFarmerId(farmerProduceArr.farmerId)

    res.status(200).json({
      farmer,
      farmerProduces: farmerProduceArr
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Create new farmer produce
 */
export const createFarmerProduce = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params
    const { unionCode } = req.locals
    const { ...farmerData } = req.body

    const farmer = {
      product: productId,
      ...farmerData
    }

    if (unionCode !== farmer.unionCode) {
      res.status(403).json({
        message: 'You are not authorized to create this farmer produce.'
      })
      return
    }

    const farmerProduce = await postFarmerProduceDetail(farmer)
    await updateFarmerCollection(farmer.farmerId, farmerProduce._id)

    res.status(200).json(farmerProduce)

    // Create activity records
    const activity = {
      activityHolderId: farmerProduce.id,
      activityHolderType: 'FARMER_PRODUCE',
      activityType: 'FARMER_PRODUCE_CREATED',
      rootHolderId: farmerProduce.id,
      rootHolderType: 'content.eml.FarmerProduce',
      subRootHolderId: farmerProduce.id,
      subRootHolderType: 'content.eml.FarmerProduce',
      activityDescription: '',
      isShowable: true
    }

    await axPostActivity(req, activity)

    const odkSubmissionActivity = {
      activityHolderId: farmerProduce.id,
      activityHolderType: 'FARMER_PRODUCE',
      activityType: 'FARMER_PRODUCE_CREATED',
      rootHolderId: farmerProduce.id,
      rootHolderType: 'content.eml.FarmerProduce',
      subRootHolderId: farmerProduce.id,
      subRootHolderType: 'content.eml.FarmerProduce',
      activityDescription: `Submitted on ODK by ${
        farmerProduce.submitterName
      } at ${formatTimeStampFromUTC(farmerProduce.submittedOnODK)}`,
      dateCreated: farmerProduce.submittedOnODK,
      lastUpdated: farmerProduce.submittedOnODK,
      isShowable: true
    }

    await axPostActivity(req, odkSubmissionActivity)
  } catch (err) {
    next(err)
  }
}
