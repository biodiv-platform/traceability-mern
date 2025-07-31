import {
  createFilterFromSchema,
  createAggregations,
  FIELD_TYPES
} from '../utils/schema'
import { Batches, Container, FarmerProduce, Farmers, Lots } from '../models'
import mongoose from 'mongoose'

const documentAutocomplete = async (
  req: any,
  collection: any
): Promise<any> => {
  try {
    const { value, ccCodes, key, coCodes } = req.query

    const filter: Record<string, any> = { isDeleted: false }

    if (ccCodes) {
      const ccCode = ccCodes.split(',').map((code) => parseInt(code.trim(), 10))
      filter.ccCode = { $in: ccCode }
    }

    if (coCodes) {
      const coCode = coCodes.split(',').map((code) => parseInt(code.trim(), 10))
      filter.coCode = { $in: coCode }
    }

    if (value) {
      filter[key] = { $regex: value, $options: 'i' }
    }

    // Query the database with the filter, returning specific fields
    const results = await collection
      .find(filter, {
        _id: 0,
        farmerId: 1,
        [key]: 1
      })
      .limit(10)
    const formattedResults = results.map((item) => ({
      value: item.farmerId,
      label: item[key]
    }))

    return formattedResults
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

const getlistData = async (
  req: any,
  collection: any,
  preDefinedFields: any = {},
  sortBy: any = { lastUpdatedAt: -1 }
): Promise<any> => {
  try {
    const filter: Record<string, any> = { isDeleted: false }

    const schemaFilters = createFilterFromSchema(collection.schema.obj)

    // Loop through query parameters and apply filters
    Object.entries(req.query).forEach(([key, value]) => {
      const stringValue = value as string

      if (schemaFilters[key]) {
        const result = schemaFilters[key](stringValue, filter)
        if (result) Object.assign(filter, result)
      }
    })

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const listData = await collection
      .find({ ...filter }, { ...preDefinedFields })
      .sort(sortBy) // Add sorting by lastUpdatedAt in descending order (-1)
      .skip(skip)
      .limit(limit)
      .exec()

    // return total count for pagination metadata
    const totalCount = await collection.countDocuments({ ...filter })

    return {
      data: listData,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  } catch (err) {
    throw new Error(`Error while fetching details. ${err.message}`)
  }
}

const getAggregations = async (
  req: any,
  collection: any,
  aggregationFields: Record<string, string>
): Promise<any> => {
  try {
    const filter: Record<string, any> = { isDeleted: false }
    const schemaFilters = createFilterFromSchema(collection.schema.obj)

    let lastFilterKey: string | undefined

    // Apply filters based on query parameters
    for (const [key, value] of Object.entries(req.query)) {
      const applyFilter = schemaFilters[key]
      if (applyFilter) {
        Object.assign(filter, applyFilter(value as string, filter))
        lastFilterKey = key
      }
    }

    const { aggregations } = createAggregations(
      aggregationFields,
      filter,
      lastFilterKey
    )

    const results = await Promise.all(
      Object.values(aggregations).map((pipeline) =>
        collection.aggregate(pipeline)
      )
    )

    return results.reduce((acc, result, index) => {
      const field = Object.keys(aggregations)[index]
      if (!result || result.length === 0) {
        return acc
      }
      if (aggregationFields[field] === FIELD_TYPES.MINMAX) {
        const minMaxResult = result[0]
        if (minMaxResult) {
          acc[field] = { min: minMaxResult.min, max: minMaxResult.max }
        }
      } else {
        acc[field] = result.reduce((formattedAcc, item) => {
          const key = item[Object.keys(item).find((k) => k !== 'count')]
          formattedAcc[key] = item.count
          return formattedAcc
        }, {})
      }
      return acc
    }, {})
  } catch (err) {
    console.error(err)
    throw new Error('Error while fetching details')
  }
}

interface DocumentCounts {
  farmerProduceCount: number
  batchCount: number
  lotCount: number
  containerCount: number
}

interface CsvDataItem {
  containerId?: string
  containerName?: string
  lotId?: string
  lotName?: string
  batchId?: string
  batchName?: string
  produceId: string
  farmerId: string
  farmerName: string
  gender: string
  cc: string
  village: string
  quantity: number
  noOfCoffeeTrees: number
  landAcreage: number
  coffeeAcreage: number
  noOfFarmPlots: number
  yearOfFirstPlanting: string
  isLocationVerified: boolean
  dateOfProduceCollection: string
  farmLocations: string
}

const getDocumentCounts = async (
  unionCode: number
): Promise<DocumentCounts> => {
  const farmerProduceCount = await FarmerProduce.countDocuments({
    produceStatus: { $in: ['ready_for_batch'] },
    unionCode
  })

  const batchCount = await Batches.countDocuments({
    batchStatus: { $in: ['pending', 'ready_for_lot'] },
    unionCode
  })

  const lotCount = await Lots.countDocuments({
    lotStatus: { $in: ['pending', 'ready_for_container'] },
    unionCode
  })

  const containerCount = await Container.countDocuments({
    _id: { $exists: true },
    unionCode
  })

  return {
    farmerProduceCount,
    batchCount,
    lotCount,
    containerCount
  }
}

const generateCsvData = async (
  level: string,
  ids: string[]
): Promise<CsvDataItem[]> => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Missing or invalid 'ids' array")
  }

  const idArray = ids.map((id) => new mongoose.Types.ObjectId(id))
  const csvData: CsvDataItem[] = []

  if (level === 'container') {
    const containers = await Container.find({
      _id: { $in: idArray },
      isDeleted: false
    }).lean()

    for (const container of containers) {
      const lots = await Lots.find({ containerId: container._id }).lean()

      for (const lot of lots) {
        const batches = await Batches.find({
          _id: { $in: lot.batchIds }
        }).lean()
        const produces = await FarmerProduce.find({
          _id: { $in: lot.farmerProduceIds }
        }).lean()

        for (const batch of batches) {
          for (const produce of produces) {
            const farmer = await Farmers.findOne({
              instanceID: produce.farmerEID
            }).lean()

            csvData.push({
              containerId: container._id.toString(),
              containerName: container.containerName || '',
              lotId: lot._id.toString(),
              lotName: lot.lotName,
              batchId: batch._id.toString(),
              batchName: batch.batchName || '',
              produceId: produce._id.toString(),
              farmerId: produce.farmerId || '',
              farmerName: farmer?.farmerName || '',
              gender: farmer?.gender || '',
              cc: farmer?.cc || '',
              village: farmer?.village || '',
              quantity: produce.quantity || 0,
              noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
              landAcreage: farmer?.landAcreage || 0,
              coffeeAcreage: farmer?.coffeeAcreage || 0,
              noOfFarmPlots: farmer?.noOfFarmPlots || 0,
              yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
              isLocationVerified: farmer?.isLocationVerified || false,
              dateOfProduceCollection: produce.dateOfCollection || '',
              farmLocations: farmer?.centroid?.coordinates || ''
            })
          }
        }
      }
    }
  } else if (level === 'lot') {
    const lots = await Lots.find({
      _id: { $in: idArray },
      isDeleted: false
    }).lean()

    for (const lot of lots) {
      const batches = await Batches.find({
        _id: { $in: lot.batchIds }
      }).lean()
      const produces = await FarmerProduce.find({
        _id: { $in: lot.farmerProduceIds }
      }).lean()

      for (const batch of batches) {
        for (const produce of produces) {
          const farmer = await Farmers.findOne({
            instanceID: produce.farmerEID
          }).lean()

          csvData.push({
            lotId: lot._id.toString(),
            lotName: lot.lotName,
            batchId: batch._id.toString(),
            batchName: batch.batchName || '',
            produceId: produce._id.toString(),
            farmerId: produce.farmerId || '',
            farmerName: farmer?.farmerName || '',
            gender: farmer?.gender || '',
            cc: farmer?.cc || '',
            village: farmer?.village || '',
            quantity: produce.quantity || 0,
            noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
            landAcreage: farmer?.landAcreage || 0,
            coffeeAcreage: farmer?.coffeeAcreage || 0,
            noOfFarmPlots: farmer?.noOfFarmPlots || 0,
            yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
            isLocationVerified: farmer?.isLocationVerified || false,
            dateOfProduceCollection: produce.dateOfCollection || '',
            farmLocations: farmer?.centroid?.coordinates || ''
          })
        }
      }
    }
  } else if (level === 'batch') {
    const batches = await Batches.find({
      _id: { $in: idArray },
      isDeleted: false
    }).lean()

    for (const batch of batches) {
      const produces = await FarmerProduce.find({
        _id: { $in: batch.farmerProduceIds }
      }).lean()

      for (const produce of produces) {
        const farmer = await Farmers.findOne({
          instanceID: produce.farmerEID
        }).lean()

        csvData.push({
          batchId: batch._id.toString(),
          batchName: batch.batchName || '',
          produceId: produce._id.toString(),
          farmerId: produce.farmerId || '',
          farmerName: farmer?.farmerName || '',
          gender: farmer?.gender || '',
          cc: farmer?.cc || '',
          village: farmer?.village || '',
          quantity: produce.quantity || 0,
          noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
          landAcreage: farmer?.landAcreage || 0,
          coffeeAcreage: farmer?.coffeeAcreage || 0,
          noOfFarmPlots: farmer?.noOfFarmPlots || 0,
          yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
          isLocationVerified: farmer?.isLocationVerified || false,
          dateOfProduceCollection: produce.dateOfCollection || '',
          farmLocations: farmer?.centroid?.coordinates || ''
        })
      }
    }
  } else if (level === 'produce') {
    const produces = await FarmerProduce.find({
      _id: { $in: idArray },
      isDeleted: false
    }).lean()

    for (const produce of produces) {
      if (!produce.farmerId) continue
      const farmer = await Farmers.findOne({
        instanceID: produce.farmerEID
      }).lean()

      csvData.push({
        produceId: produce._id.toString(),
        farmerId: produce.farmerId || '',
        farmerName: farmer?.farmerName || '',
        gender: farmer?.gender || '',
        cc: farmer?.cc || '',
        village: farmer?.village || '',
        quantity: produce.quantity || 0,
        noOfCoffeeTrees: farmer?.noOfCoffeeTrees || 0,
        landAcreage: farmer?.landAcreage || 0,
        coffeeAcreage: farmer?.coffeeAcreage || 0,
        noOfFarmPlots: farmer?.noOfFarmPlots || 0,
        yearOfFirstPlanting: farmer?.yearOfFirstPlanting || '',
        isLocationVerified: farmer?.isLocationVerified || false,
        dateOfProduceCollection: produce.dateOfCollection || '',
        farmLocations: farmer?.centroid?.coordinates || ''
      })
    }
  } else {
    throw new Error('Invalid level specified')
  }

  return csvData
}

export {
  documentAutocomplete,
  getAggregations,
  getlistData,
  getDocumentCounts,
  generateCsvData
}
