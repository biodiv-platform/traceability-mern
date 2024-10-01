import { FarmerProduce, Farmers, Batches, Lots } from '../models'
interface SchemaField {
  // eslint-disable-next-line @typescript-eslint/ban-types
  type: Function
  required?: boolean
  default?: any
}

type Schema = Record<string, SchemaField>

type FilterFunctions = Record<string, (value: string, filter?: any) => any>

export const MODELS = {
  Farmers,
  FarmerProduce,
  Batches,
  Lots
}

export const FIELD_TYPES = {
  MINMAX: 'minMax',
  GROUPANDCOUNT: 'groupAndCount',
  UNWINDANDGROUP: 'unwindAndGroup',
  BOOLEAN: 'boolean'
}

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
    } else if (fieldType === Boolean) {
      filters[key] = (value) => {
        const boolValue = value.toLowerCase() === 'true'
        return { [key]: boolValue }
      }
    } else if (fieldType === Array) {
      filters[key] = (value) => {
        const arrayValues = value.split(',').map((v) => Number(v.trim()))
        return { [key]: { $in: arrayValues } }
      }
    }
  })

  return filters
}

type Aggregations = Record<string, any[]>

interface AggregationResult {
  aggregations: Aggregations
}

export const createAggregations = (
  aggregationFields: Record<string, string>,
  filter: Record<string, any>
): AggregationResult => {
  const aggregations: Aggregations = {}

  Object.entries(aggregationFields).forEach(([field, type]) => {
    switch (type) {
      case FIELD_TYPES.MINMAX:
        aggregations[field] = [
          {
            $group: {
              _id: null,
              min: { $min: `$${field}` },
              max: { $max: `$${field}` }
            }
          },
          {
            $project: {
              _id: 0,
              min: 1,
              max: 1
            }
          }
        ]
        break

      case FIELD_TYPES.GROUPANDCOUNT:
      case FIELD_TYPES.UNWINDANDGROUP:
      case FIELD_TYPES.BOOLEAN: {
        const matchStage = { $match: filter }
        const groupStage = {
          $group: { _id: `$${field}`, count: { $sum: 1 } }
        }
        const sortStage = { $sort: { _id: 1 } }
        const projectStage = {
          $project: { _id: 0, [field]: '$_id', count: 1 }
        }

        if (type === FIELD_TYPES.UNWINDANDGROUP) {
          aggregations[field] = [
            matchStage,
            { $unwind: `$${field}` },
            groupStage,
            sortStage,
            projectStage
          ]
        } else {
          aggregations[field] = [
            matchStage,
            groupStage,
            sortStage,
            projectStage
          ]
        }
        break
      }
      default:
        console.warn(`Unknown aggregation type for field: ${field}`)
    }
  })

  return { aggregations }
}
