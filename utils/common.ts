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

const cleanFeature = (feature) => {
  try {
    return cleanCoords(feature)
  } catch (error) {
    console.warn('Error cleaning feature:', error.message)
    return feature
  }
}

const removeDuplicateVertices = (coordinates: any[]) => {
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

const handlePoint = (pointGeometry) => {
  return {
    location: pointGeometry,
    centroid: {
      type: 'Point',
      coordinates: pointGeometry.coordinates
    }
  }
}

const handleMultiPoint = (multiPointGeometry) => {
  const centroid = turf.center(multiPointGeometry)
  return {
    location: multiPointGeometry,
    centroid: centroid.geometry
  }
}

const handleMultiPolygon = (multiPolygonFeature) => {
  // Ensure it's a MultiPolygon
  if (multiPolygonFeature.geometry.type === 'Polygon') {
    multiPolygonFeature = turf.multiPolygon([
      multiPolygonFeature.geometry.coordinates
    ])
  }

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
    return {
      location: null,
      centroid: null
    }
  }

  // Check for self-intersections
  const kinks = turf.kinks(multiPolygonFeature)

  let finalGeometry
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

    finalGeometry = convertToMultiPolygon(cleanedGeometry)
  } else {
    // If there are no kinks, use the cleaned geometry
    finalGeometry = multiPolygonFeature.geometry
  }

  // Calculate centroids for each polygon
  const centroids = finalGeometry.coordinates.map((polygonCoords) => {
    const polygon = turf.polygon(polygonCoords)
    const centroid = turf.centroid(polygon)
    return centroid.geometry.coordinates
  })

  let centroidGeometry
  if (centroids.length === 1) {
    // If there's only one polygon, return a Point
    centroidGeometry = {
      type: 'Point',
      coordinates: centroids[0]
    }
  } else {
    // If there are multiple polygons, return a MultiPoint
    centroidGeometry = {
      type: 'MultiPoint',
      coordinates: centroids
    }
  }

  return {
    location: finalGeometry,
    centroid: centroidGeometry
  }
}

export const checkAndFixGeometry = (geometry) => {
  // Convert to a Feature if it's not already one
  const feature =
    geometry.type === 'Feature' ? geometry : turf.feature(geometry)

  switch (feature.geometry.type) {
    case 'Point':
      return handlePoint(feature.geometry)
    case 'MultiPoint':
      return handleMultiPoint(feature.geometry)
    case 'Polygon':
    case 'MultiPolygon':
      return handleMultiPolygon(feature)
    default:
      console.error('Unsupported geometry type:', feature.geometry.type)
      return {
        location: null,
        centroid: null
      }
  }
}
