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
      filters[key] = (value, filter) => {
        filter[key] = {
          ...(filter[key] || {}),
          $gte: new Date(value)
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
