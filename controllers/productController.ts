import type { Request, Response, NextFunction } from 'express'
import { unionIdToUnionName } from '../utils'
import {
  getAllProducts,
  getProductById,
  createProduct,
  retrieveFarmerMembersLastFetchedTime,
  retrieveFarmerProduceLastFetchedTime
} from '../services/productService'

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await getAllProducts()
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
}

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params
    const product = await getProductById(productId)
    res.status(200).json(product)
  } catch (err) {
    next(err)
  }
}

export const createNewProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productName, description, columns } = req.body

    const productData = {
      productName,
      description,
      columns
    }

    const createdProduct = await createProduct(productData)
    res.status(201).json(createdProduct)
  } catch (err) {
    next(err)
  }
}

export const getFarmerMembersLastSyncedTime = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.query
    const formName = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerMembersLastFetchedTime(formName)
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
}

export const getFarmerProduceLastSyncedTime = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.query
    const formName = unionIdToUnionName(Number(key))
    const lastFetchedTime = await retrieveFarmerProduceLastFetchedTime(formName)
    res.status(200).json(lastFetchedTime)
  } catch (err) {
    next(err)
  }
}
