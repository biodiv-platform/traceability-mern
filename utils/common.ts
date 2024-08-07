import { FARMER_MEMBER_ODK_FORM_DETAILS } from '../static/constants'
import * as turf from '@turf/turf'
import unkinkPolygon from '@turf/unkink-polygon'
import cleanCoords from '@turf/clean-coords'

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

function cleanFeature(feature) {
  try {
    return cleanCoords(feature)
  } catch (error) {
    console.warn('Error cleaning feature:', error.message)
    return feature
  }
}

function removeDuplicateVertices(coordinates) {
  return coordinates.map((polygon) => {
    return polygon.map((ring) => {
      const uniqueCoords = []
      const seen = new Set()

      for (const coord of ring) {
        const key = coord.join(',')
        if (!seen.has(key)) {
          seen.add(key)
          uniqueCoords.push(coord)
        }
      }

      // Ensure the polygon is closed by adding the first point at the end if necessary
      if (
        uniqueCoords.length > 0 &&
        (uniqueCoords[0][0] !== uniqueCoords[uniqueCoords.length - 1][0] ||
          uniqueCoords[0][1] !== uniqueCoords[uniqueCoords.length - 1][1])
      ) {
        uniqueCoords.push(uniqueCoords[0])
      }

      return uniqueCoords
    })
  })
}

const convertToMultiPolygon = (geometry) => {
  if (geometry.type === 'FeatureCollection') {
    const polygons = geometry.features.map(
      (feature) => feature.geometry.coordinates
    )
    return turf.multiPolygon(polygons).geometry
  } else if (geometry.type === 'Feature') {
    return turf.multiPolygon([geometry.geometry.coordinates]).geometry
  } else {
    return geometry
  }
}

export const checkAndFixGeometry = (multiPolygon) => {
  // Convert to a Feature if it's not already one
  let multiPolygonFeature =
    multiPolygon.type === 'Feature'
      ? multiPolygon
      : turf.multiPolygon(multiPolygon.coordinates)

  // Remove duplicate vertices
  multiPolygonFeature.geometry.coordinates = removeDuplicateVertices(
    multiPolygonFeature.geometry.coordinates
  )

  // Ensure the geometry is valid
  try {
    multiPolygonFeature = turf.multiPolygon(
      multiPolygonFeature.geometry.coordinates
    )
  } catch (error) {
    console.error('Error creating MultiPolygon:', error)
    return null
  }

  // Check for self-intersections
  const kinks = turf.kinks(multiPolygonFeature)

  if (kinks.features.length > 0) {
    // Fix self-intersections
    const fixedGeometry = unkinkPolygon(multiPolygonFeature)

    // Clean coordinates
    let cleanedGeometry
    if (fixedGeometry.type === 'FeatureCollection') {
      cleanedGeometry = {
        type: 'FeatureCollection',
        features: fixedGeometry.features.map(cleanFeature)
      }
    } else if (fixedGeometry.type === 'Feature') {
      cleanedGeometry = cleanFeature(fixedGeometry)
    } else {
      cleanedGeometry = fixedGeometry
    }

    const multiPolygonObj = convertToMultiPolygon(cleanedGeometry)
    return multiPolygonObj
  } else {
    // If there are no kinks, return the cleaned geometry
    return multiPolygonFeature.geometry
  }
}
