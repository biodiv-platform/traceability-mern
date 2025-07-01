import type { Request, Response, NextFunction } from 'express'
import {
  getBatch,
  getFarmerProduceDetailsByBatchId,
  getBatchFarmersAndProduce,
  createBatch,
  updateBatch,
  getAllBatchCoCodes,
  getBatchAggregations
} from '../services/batchService'
import { axPostActivity } from '../services'

export const getBatchCoCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batchData = await getAllBatchCoCodes(req)
    res.status(200).json(batchData)
  } catch (err) {
    next(err)
  }
}

export const getBatchAggregationData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aggregationData = await getBatchAggregations(req)
    res.status(200).json({ aggregationData })
  } catch (err) {
    next(err)
  }
}

export const getFarmerProduceByBatchId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params
    const farmerProduceArr = await getFarmerProduceDetailsByBatchId(batchId)
    res.status(200).json(farmerProduceArr)
  } catch (err) {
    next(err)
  }
}

export const getBatchDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params
    const batch = await getBatch(batchId)

    if (!batch) {
      throw new Error('Invalid batch id found')
    }

    const { farmerArr, farmerLocationArr, farmerProduceArr } =
      await getBatchFarmersAndProduce(batch)

    const result = {
      batch,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr
    }

    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export const createNewBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { unionCode } = req.locals

    const { farmerProduceIds, type: batchType, ...batchData } = req.body

    if (batchData.unionCode !== unionCode) {
      res
        .status(403)
        .json({ error: 'You are not authorized to create this batch.' })
      return
    }

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      res.status(400).json({ error: 'Farmer ids are required to create batch' })
      return
    }

    const result = await createBatch(
      { farmerProduceIds, type: batchType, unionCode, ...batchData },
      async (activity) => await axPostActivity(req, activity)
    )

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export const updateBatchDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params
    const { unionCode } = req.locals
    const updateData = req.body

    const batch = await getBatch(batchId)
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' })
      return
    }

    if (batch.unionCode !== unionCode) {
      res.status(403).json({
        error: 'You are not authorized to modify this batch.'
      })
      return
    }

    const updatedBatch = await updateBatch(
      batchId,
      updateData,
      async (activity) => await axPostActivity(req, activity)
    )

    res.status(200).json(updatedBatch)
  } catch (err) {
    next(err)
  }
}
