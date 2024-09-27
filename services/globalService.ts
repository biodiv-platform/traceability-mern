import { createFilterFromSchema, createAggregations } from '../utils/schema'

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

const getlistData = async (req: any, collection: any): Promise<any> => {
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

    const listData = await collection.find(filter)
    return listData
  } catch (err) {
    throw new Error('Error while fetching farmer details')
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
      const stringValue = value as string
      const applyFilter = schemaFilters[key]
      if (applyFilter) {
        Object.assign(filter, applyFilter(stringValue, filter))
      }
    }

    const { aggregation, additionalAggregations } = createAggregations(
      aggregationFields,
      filter
    )

    // Execute the main aggregation and additional aggregations concurrently
    const results = await Promise.all([
      collection.aggregate(aggregation),
      ...Object.values(additionalAggregations).map((pipeline) =>
        collection.aggregate(pipeline)
      )
    ])

    // Process additional aggregation results
    const formattedData = Object.keys(additionalAggregations).reduce(
      (acc, field, index) => {
        acc[field] = results[index + 1].reduce((formattedAcc, item) => {
          formattedAcc[item[field]] = item.count
          return formattedAcc
        }, {})
        return acc
      },
      {}
    )

    // Merge the main aggregation result with additional aggregations
    return { ...results[0][0], ...formattedData }
  } catch (err) {
    throw new Error('Error while fetching farmer details')
  }
}

export { documentAutocomplete, getAggregations, getlistData }
