import type { Request, Response, NextFunction } from 'express'
import { Parser } from 'json2csv'
import { MODELS } from '../utils/schema'
import {
  documentAutocomplete,
  getDocumentCounts,
  generateCsvData
} from '../services/globalService'

export const getDocumentAutocomplete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const model = req.query.model as string

    // Validate model parameter
    if (!MODELS[model]) {
      res.status(400).json({ error: 'Invalid model provided.' })
      return
    }

    const results = await documentAutocomplete(req, MODELS[model])
    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
}

export const getCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const unionCode = Number(req.query.union)

    // Validate unionCode
    if (isNaN(unionCode)) {
      res.status(400).json({ error: 'Invalid union code provided.' })
      return
    }

    const count = await getDocumentCounts(unionCode)
    res.status(200).json({ count })
  } catch (err) {
    next(err)
  }
}

export const downloadData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { level } = req.params
    const { ids } = req.body

    // Validate level parameter
    if (!['container', 'lot', 'batch', 'produce'].includes(level)) {
      res.status(400).json({ error: 'Invalid level specified.' })
      return
    }

    // Validate ids array
    if (!Array.isArray(ids) || ids.length === 0) {
      res
        .status(400)
        .json({ error: "Missing or invalid 'ids' array in request body." })
      return
    }

    const csvData = await generateCsvData(level, ids)
    const parser = new Parser()
    const csv = parser.parse(csvData)

    res.header('Content-Type', 'text/csv')
    res.attachment(`${level}_data.csv`)
    res.send(csv)
  } catch (err) {
    console.error('CSV download error:', err)
    res.status(500).json({ error: 'Failed to generate CSV.' })
  }
}
