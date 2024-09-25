interface SchemaField {
  // eslint-disable-next-line @typescript-eslint/ban-types
  type: Function
  required?: boolean
  default?: any
}

type Schema = Record<string, SchemaField>

type FilterFunctions = Record<string, (value: string, filter?: any) => any>

// Function to escape special regex characters
export function escapeRegex (value: string): string {
  return value.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

// Create filter functions based on schema
export function createFilterFromSchema (schema: Schema): FilterFunctions {
  const filters: FilterFunctions = {}

  Object.entries(schema).forEach(([key, field]) => {
    const fieldType = field.type as unknown

    if (key === 'ccCode' && fieldType === Number) {
      filters.ccCodes = (value) => {
        const ccCodes = value
          .split(',')
          .map((code) => parseInt(code.trim(), 10))
        return { [key]: { $in: ccCodes } }
      }
    } else if (key === 'coCode' && fieldType === Number) {
      filters.coCodes = (value) => {
        const coCodes = value
          .split(',')
          .map((code) => parseInt(code.trim(), 10))
        return { [key]: { $in: coCodes } }
      }
    } else if (fieldType === String) {
      // Handle comma-separated values for strings
      filters[key] = (value) => {
        if (value.includes(',')) {
          return { [key]: { $in: value.split(',').map((v) => v.trim()) } }
        }
        return { [key]: { $regex: `^${escapeRegex(value)}$`, $options: 'i' } }
      }
    } else if (fieldType === Number) {
      filters[key] = (value) => {
        const [min, max] = value.split('-').map(Number)
        return { [key]: { $gte: min || 0, $lte: max || Infinity } }
      }
    } else if (fieldType === Date) {
      // Updated logic for Date fields
      filters[key] = (value) => {
        const [startDateStr, endDateStr] = value.split(',')
        const startDate = startDateStr ? new Date(startDateStr) : null
        const endDate = endDateStr ? new Date(endDateStr) : null

        // If both dates are the same, match the date by adjusting start and end of the day
        if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
          const startOfDay = new Date(startDate.setHours(0, 0, 0, 0))
          const endOfDay = new Date(startDate.setHours(23, 59, 59, 999))
          return { [key]: { $gte: startOfDay, $lte: endOfDay } }
        }

        return {
          [key]: {
            ...(startDate ? { $gte: startDate } : {}),
            ...(endDate ? { $lte: endDate } : {})
          }
        }
      }
    } else if (Array.isArray(fieldType) && fieldType[0] === String) {
      filters[key] = (value) => {
        const arrayValues = value.split(',').map((v) => v.trim())
        return { [key]: { $in: arrayValues } }
      }
    }
  })

  return filters
}

// Helper to capitalize field names
export function capitalizeFiledNames (str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// type AggregationFields = Record<string, 'minMax' | 'groupAndCount' | 'unwindAndGroup'>

type AdditionalAggregations = Record<string, any[]>

interface AggregationResult {
  aggregation: any[]
  additionalAggregations: AdditionalAggregations
}

// Utility function to capitalize field names
const capitalizeFieldNames = (field: string): string =>
  field.charAt(0).toUpperCase() + field.slice(1)

// Combined function to create aggregation pipelines
export const createAggregations = (
  aggregationFields,
  filter: any
): AggregationResult => {
  const groupStage: any = {
    _id: null,
    totalCount: { $sum: 1 }
  }

  const projectStage: any = {
    _id: 0,
    totalCount: 1
  }

  const additionalAggregations: AdditionalAggregations = {}

  Object.entries(aggregationFields).forEach(([field, type]) => {
    const capitalizedField = capitalizeFieldNames(field)

    if (type === 'minMax') {
      groupStage[`min${capitalizedField}`] = { $min: `$${field}` }
      groupStage[`max${capitalizedField}`] = { $max: `$${field}` }

      projectStage[field] = {
        min: `$min${capitalizedField}`,
        max: `$max${capitalizedField}`
      }
    } else if (type === 'groupAndCount') {
      additionalAggregations[field] = [
        { $match: filter },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, [field]: '$_id', count: 1 } }
      ]
    } else if (type === 'unwindAndGroup') {
      additionalAggregations[field] = [
        { $match: filter },
        { $unwind: `$${field}` },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, [field]: '$_id', count: 1 } }
      ]
    } else if (type === 'boolean') {
      groupStage[`true${capitalizedField}`] = {
        $sum: { $cond: [{ $eq: [`$${field}`, true] }, 1, 0] }
      }
      groupStage[`false${capitalizedField}`] = {
        $sum: { $cond: [{ $eq: [`$${field}`, false] }, 1, 0] }
      }

      projectStage[field] = {
        true: `$true${capitalizedField}`,
        false: `$false${capitalizedField}`
      }
    }
  })

  const aggregation = [
    { $match: filter },
    { $group: groupStage },
    { $project: projectStage }
  ]

  return { aggregation, additionalAggregations }
}
