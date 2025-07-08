import type { Request, Response, NextFunction } from 'express'
import {
  getAllFarmersService,
  getAggregatedFarmerDataService,
  createFarmerService,
  fetchFarmerMembersFromODKCronService,
  fetchFarmerMembersFromODKOnDemandService,
  getFarmersByUnionService,
  getFarmerDetailsService,
  getFarmerByIdService,
  getFarmerByUUIDService,
  updateFarmerService,
  deleteFarmerService
} from '../services'

export const getAllFarmers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmers = await getAllFarmersService(req)
    res.status(200).json(farmers)
  } catch (err) {
    next(err)
  }
}

export const getAggregatedFarmerData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aggregationData = await getAggregatedFarmerDataService(req)
    res.status(200).json({ aggregationData })
  } catch (err) {
    next(err)
  }
}

export const createFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params
    const { unionCode } = req.locals
    const { ...farmerData } = req.body

    try {
      const savedFarmer = await createFarmerService(
        req,
        productId,
        unionCode,
        farmerData
      )
      res.status(200).json(savedFarmer)
    } catch (error) {
      if (error.message === 'Not authorized to create this farmer') {
        res
          .status(403)
          .json({ error: 'You are not authorized to create this farmer.' })
        return
      }
      throw error
    }
  } catch (err) {
    next(err)
  }
}

export const fetchFarmerMembersFromODKCron = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const results = await fetchFarmerMembersFromODKCronService(req)
    return res.status(200).json({ results })
  } catch (err) {
    const errorMessage = `Error in fetching farmer members from ODK using cron. error: ${err.message}`
    return res.status(500).json({ message: errorMessage })
  }
}

export const fetchFarmerMembersFromODKOnDemand = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { key } = req.query
    const result = await fetchFarmerMembersFromODKOnDemandService(
      req,
      key as string
    )
    return res.status(200).json(result)
  } catch (err) {
    if (err.message === 'Key is required') {
      return res.status(400).json({ message: 'Key is required' })
    }
    if (err.message === 'Data is undefined') {
      return res.status(500).json({ message: 'Data is undefined' })
    }
    return res.status(500).json({ message: err.message })
  }
}

export const getFarmersByUnion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { unionCode } = req.query
    const farmers = await getFarmersByUnionService(Number(unionCode))
    res.status(200).json(farmers)
  } catch (err) {
    next(err)
  }
}

export const getFarmerDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params
    const result = await getFarmerDetailsService(farmerId)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export const getFarmerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params
    const farmer = await getFarmerByIdService(farmerId)
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
}

export const getFarmerByUUID = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerUUID } = req.params
    const farmer = await getFarmerByUUIDService(farmerUUID)
    res.status(200).json(farmer)
  } catch (err) {
    next(err)
  }
}

export const updateFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params
    const { unionCode } = req.locals
    const payload = req.body

    try {
      const updatedFarmer = await updateFarmerService(
        req,
        farmerId,
        unionCode,
        payload
      )
      res.status(200).json(updatedFarmer)
    } catch (error) {
      if (error.message === 'Payload cannot be empty') {
        res.status(400).json({
          error: 'Payload cannot be empty',
          message: 'Please provide valid update information'
        })
        return
      }
      if (error.message === 'Farmer not found') {
        res.status(404).json({ error: 'Farmer not found' })
        return
      }
      if (error.message === 'Not authorized to modify this farmer') {
        res
          .status(403)
          .json({ error: 'You are not authorized to modify this farmer.' })
        return
      }
      throw error
    }
  } catch (err) {
    next(err)
  }
}

export const deleteFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params
    try {
      await deleteFarmerService(req, farmerId)
      res.status(200).json({ message: 'Farmer deleted successfully' })
    } catch (error) {
      if (error.message === 'Farmer not found') {
        res.status(404).json({ error: 'Farmer not found' })
        return
      }
      throw error
    }
  } catch (err) {
    next(err)
  }
}
