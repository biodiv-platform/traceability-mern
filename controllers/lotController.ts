import type { Request, Response, NextFunction } from 'express'
import {
  getLot,
  createNewLot,
  splitLot,
  updateLot,
  getAllLotCoCodes,
  getLotAggregations,
  deleteAllLots,
  axPostActivity,
  getBatch,
  getBatchesByBatchIds,
  getFarmerDetailsBySubmissionUUID,
  getFarmerProduceDetailsById
} from '../services'

export const getAllLotCoCodesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lotData = await getAllLotCoCodes(req)
    res.status(200).json(lotData)
  } catch (err) {
    next(err)
  }
}

export const getLotAggregationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aggregationData = await getLotAggregations(req)
    res.status(200).json({ aggregationData })
  } catch (err) {
    next(err)
  }
}

export const createNewLotController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { unionCode } = req.locals
    const { batchIds, ...lotData } = req.body

    if (lotData.unionCode !== unionCode) {
      res
        .status(403)
        .json({ message: 'You are not authorized to create this lot.' })
      return
    }

    if (!batchIds || batchIds.length === 0) {
      res.status(400).json({ message: 'Batch ids are required to create lot' })
      return
    }

    const savedLot = await createNewLot(lotData, batchIds, unionCode)

    // Add activity of lot creation
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

    const result = {
      lot: savedLot,
      batches: batchIds
    }

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export const splitLotController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lotId } = req.params
    const { unionCode } = req.locals
    const lotData = req.body

    const existingLot = await getLot(lotId)
    if (!existingLot) {
      res.status(404).json({ message: 'Lot not found' })
      return
    }

    if (existingLot.unionCode !== unionCode) {
      res
        .status(403)
        .json({ message: 'You are not authorized to modify this lot.' })
      return
    }

    const savedSplittedLots = await splitLot(lotId, lotData)

    for (const splitLot of savedSplittedLots) {
      const activity = {
        activityHolderId: splitLot.id,
        activityHolderType: 'LOT',
        activityType: 'LOT_CREATION',
        rootHolderId: splitLot.id,
        rootHolderType: 'content.eml.Lot',
        subRootHolderId: splitLot.id,
        subRootHolderType: 'content.eml.Lot',
        activityDescription: `Sub Lot: ${splitLot.lotName} created.`,
        isShowable: true
      }
      await axPostActivity(req, activity)
    }

    res.status(201).json({
      message: 'SubLots created successfully',
      lots: savedSplittedLots
    })
  } catch (err) {
    next(err)
  }
}

export const updateLotController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lotId } = req.params
    const { unionCode } = req.locals
    const lotData = req.body

    const existingLot = await getLot(lotId)
    if (!existingLot) {
      res.status(404).json({ message: 'Lot not found' })
      return
    }

    if (existingLot.unionCode !== unionCode) {
      res
        .status(403)
        .json({ message: 'You are not authorized to modify this lot.' })
      return
    }

    const updatedLot = await updateLot(lotId, lotData)

    const timestamp = new Date().toISOString()
    const activity = {
      activityHolderId: existingLot.id,
      activityHolderType: 'LOT',
      lastUpdated: timestamp,
      activityType: 'LOT_UPDATE',
      rootHolderId: existingLot.id,
      rootHolderType: 'content.eml.Lot',
      subRootHolderId: existingLot.id,
      subRootHolderType: 'content.eml.Lot',
      activityDescription: `${lotData.columnName} column updated.`,
      isShowable: true
    }

    await axPostActivity(req, activity)
    res.status(200).json(updatedLot)
  } catch (err) {
    next(err)
  }
}

export const getLotBatchesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lotId } = req.query
    const lot = await getLot(lotId as string)

    if (!lot) {
      throw new Error('Invalid lot id found')
    }

    const { batchIds } = lot
    const batches = await getBatchesByBatchIds(batchIds)
    res.status(200).json(batches)
  } catch (err) {
    next(err)
  }
}

export const getLotByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lotId } = req.params
    const lot = await getLot(lotId)

    if (!lot) {
      res.status(404).json({ message: 'Lot not found' })
      return
    }

    const batchArr = []
    const farmerProduceArr = []
    const farmerArr = []
    const farmerLocationArr = []

    // Use a Map to track unique farmers by their ID
    const farmerMap = new Map()

    for (const batchId of lot.batchIds) {
      const batch = await getBatch(batchId)
      if (!batch) {
        throw new Error('Invalid batch id found')
      }
      batchArr.push(batch)

      for (const farmerProduceId of batch.farmerProduceIds) {
        const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId)
        if (!farmerProduce) {
          throw new Error('Invalid farmer produce id found')
        }
        const farmer = await getFarmerDetailsBySubmissionUUID(
          farmerProduce.farmerEID
        )
        if (!farmer) {
          throw new Error('Invalid farmer id found')
        }

        // Only add if not already in the map
        if (!farmerMap.has(farmer._id.toString())) {
          farmerMap.set(farmer._id.toString(), farmer)
          farmerArr.push(farmer)

          // Add to farmerLocationArr only if the farmer is unique
          farmerLocationArr.push({
            type: 'Feature',
            geometry: {
              type: farmer.centroid.type,
              coordinates: farmer.centroid.coordinates
            },
            properties: {
              name: farmer.farmerName,
              _id: farmer._id,
              farmerId: farmer.farmerId,
              cc: farmer.cc,
              batchId: batch.batchId,
              noOfFarms: farmer.noOfFarmPlots
            }
          })
        }

        farmerProduceArr.push({
          ...farmerProduce.toObject(),
          cc: farmer?.cc
        })
      }
    }

    const result = {
      lot,
      batches: batchArr,
      farmerProduceArr,
      farmerArr,
      farmerLocationArr
    }

    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export const deleteAllLotsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteAllLots()
    res.status(200).json({ message: 'All lots deleted successfully' })
  } catch (err) {
    next(err)
  }
}
