import {
  createFilterFromSchema,
  createAggregations,
  FIELD_TYPES
} from '../utils/schema'

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

    const listData = await collection
      .find({ ...filter }, { ...preDefinedFields })
      .sort(sortBy) // Add sorting by lastUpdatedAt in descending order (-1)
      .exec()
    return listData
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

    // Apply filters based on query parameters
    for (const [key, value] of Object.entries(req.query)) {
      const applyFilter = schemaFilters[key]
      if (applyFilter) {
        Object.assign(filter, applyFilter(value as string, filter))
      }
    }

    const { aggregations } = createAggregations(aggregationFields, filter)

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

export { documentAutocomplete, getAggregations, getlistData }
