import { FARMER_MEMBER_ODK_FORM_DETAILS } from '../static/constants'

type Schema = Record<string, boolean>

type KeyMap = Record<string, string>

const snakeToCamel = (s: string): string => {
  return s.replace(/(_\w)/g, function (m) {
    return m[1].toUpperCase()
  })
}

export const deconstructObject = (
  obj: any,
  schema: Schema | string,
  keyMap: KeyMap = {}
): any => {
  const result: any = {}

  const flatten = (currentObj: any, currentSchema: any) => {
    for (const key in currentSchema) {
      const mappedKey = keyMap[key]

      if (
        typeof currentSchema[key] === 'object' &&
        currentSchema[key] !== null &&
        !Array.isArray(currentSchema[key])
      ) {
        flatten(currentObj[key], currentSchema[key])
      } else {
        if (typeof currentObj[key] === 'string') {
          result[mappedKey] = currentObj[key].trim()
        } else {
          result[mappedKey] = currentObj[key]
        }
      }
    }
  }

  flatten(obj, schema)
  return result
}

export const unionIdToUnionName = (unionId: number): string => {
  const key = Object.keys(FARMER_MEMBER_ODK_FORM_DETAILS).find(
    (key) => FARMER_MEMBER_ODK_FORM_DETAILS[key].UNION_ID === unionId
  )
  return key ? FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME : null
}
