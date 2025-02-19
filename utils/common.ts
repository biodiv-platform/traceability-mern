import { ODK_FORM_DETAILS } from '../static/constants'
import * as turf from '@turf/turf'
import unkinkPolygon from '@turf/unkink-polygon'
import type * as GeoJSON from 'geojson'

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
  const key = Object.keys(ODK_FORM_DETAILS).find(
    (key) => ODK_FORM_DETAILS[key].UNION_ID === unionId
  )
  return key ? ODK_FORM_DETAILS[key].FORM_NAME : null
}

export const checkAndFixGeometry = (
  geojson: GeoJSON.FeatureCollection
): {
  location: GeoJSON.FeatureCollection
  centroids: GeoJSON.Point | GeoJSON.MultiPoint
} => {
  if (geojson.type !== 'FeatureCollection') {
    throw new Error('Input must be a GeoJSON FeatureCollection')
  }
  const cleanedFeatures: GeoJSON.Feature[] = []
  const centroidCoordinates = []

  geojson.features.forEach((feature: any) => {
    let cleanedFeature: any = feature

    // Check if the feature is a Polygon or MultiPolygon
    if (
      feature.geometry.type === 'Polygon' ||
      feature.geometry.type === 'MultiPolygon'
    ) {
      // Check for kinks only if it's a Polygon or MultiPolygon
      if (turf.kinks(feature).features.length > 0) {
        cleanedFeature = unkinkPolygon(feature)
      }
    }

    cleanedFeatures.push(cleanedFeature)

    // Calculate centroid for all feature types
    const centroid = turf.centroid(cleanedFeature)
    centroidCoordinates.push(centroid.geometry.coordinates)
  })

  const cleanedGeojson = turf.featureCollection(cleanedFeatures)

  const centroidsGeojson: GeoJSON.Point | GeoJSON.MultiPoint = {
    type: centroidCoordinates.length === 1 ? 'Point' : 'MultiPoint',
    coordinates:
      centroidCoordinates.length === 1
        ? centroidCoordinates[0]
        : centroidCoordinates
  }

  return {
    location: cleanedGeojson,
    centroids: centroidsGeojson
  }
}

export const convertToFeatureCollection = (
  location: any
): {
  location: GeoJSON.FeatureCollection
  centroid: GeoJSON.Point | GeoJSON.MultiPoint
} => {
  if (!location?.type) {
    throw new Error('Invalid location object')
  }

  let featureCollection: GeoJSON.FeatureCollection

  if (location.type === 'Point') {
    featureCollection = turf.featureCollection([
      turf.point(location.coordinates)
    ])
  } else if (location.type === 'MultiPoint') {
    const points = location.coordinates.map((coord: number[]) =>
      turf.point(coord)
    )
    featureCollection = turf.featureCollection(points)
  } else {
    throw new Error(`Unsupported geometry type: ${location.type}`)
  }

  return {
    location: featureCollection,
    centroid: location
  }
}

export const formatTimeStampFromUTC = (ts: string | number | Date): string => {
  const date = new Date(ts)

  // Get day, month, and year
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  // Get hours, minutes, and AM/PM
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12 // Convert hour '0' to '12'

  // Format as "DD-MM-YYYY hh:mm A"
  return `${day}-${month}-${year} ${String(hours).padStart(
    2,
    '0'
  )}:${minutes} ${ampm}`
}

// console log without eslint warning
export const niceLog = (log: string): void => {
  // eslint-disable-next-line no-console
  console.log(log)
}
