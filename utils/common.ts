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
  for (const key in schema as any) {
    const camelKey = snakeToCamel(key)
    const mappedKey = keyMap[camelKey] || camelKey
    if (
      typeof schema[key] === 'object' &&
      schema[key] !== null &&
      !Array.isArray(schema[key])
    ) {
      result[mappedKey] = deconstructObject(
        obj[key],
        schema[key] as Schema,
        keyMap
      )
    } else {
      result[mappedKey] = obj[key]
    }
  }
  return result
}

export const unionIdToUnionName = (unionId: number): string => {
  const key = Object.keys(FARMER_MEMBER_ODK_FORM_DETAILS).find(
    (key) => FARMER_MEMBER_ODK_FORM_DETAILS[key].UNION_ID === unionId
  )
  return key ? FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME : null
}
