import { FARMER_MEMBER_ODK_FORM_DETAILS } from '../static/constants'
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
  const key = Object.keys(FARMER_MEMBER_ODK_FORM_DETAILS).find(
    (key) => FARMER_MEMBER_ODK_FORM_DETAILS[key].UNION_ID === unionId
  )
  return key ? FARMER_MEMBER_ODK_FORM_DETAILS[key].FORM_NAME : null
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

  geojson.features.forEach((feature) => {
    let cleanedFeature = feature

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
