import {
  type ISubLot,
  type ILot,
  type CoffeeType
} from '../interfaces/traceability'
import { Lots } from '../models'
import mongoose from 'mongoose'
import { FIELD_TYPES } from '../utils/schema'
import { LOT_FIELD_UPDATE_RULES } from '../static/constants'
import { getModalFields } from '.'
import { getSplitCoffeeType } from '../utils/common'
import { LOT_PRE_DEFINED_FIELDS } from '../static/preDefinedFields'
import { getlistData, getAggregations } from '../services'

interface LotListResponse {
  data: ILot[]
  total: number
}

interface LotAggregationResponse {
  isReadyForContainer?: {
    true?: number
    false?: number
  }
  type?: Record<string, number>
  quantity?: {
    min: number
    max: number
  }
  lotStatus?: Record<string, number>
}

interface CreateLotData {
  lotName: string
  unionCode: number
  type?: CoffeeType
  quantity?: number
  coCode: number[]
  ccCode: number[]
  [key: string]: any
}

interface SplitLotData {
  selectedModalFieldId: string
  columnName: string
  fields: Record<string, any>
}

interface UpdateLotData {
  selectedModalFieldId: string
  columnName: string
  fields: {
    finalizeLotColumn?: boolean
    [key: string]: any
  }
}

const getLot = async (lotId: string): Promise<ILot | null> => {
  try {
    const lot = await Lots.findById(lotId).lean().exec()
    return lot
  } catch (err) {
    throw new Error(`Error while fetching lot. Error: ${err.message}`)
  }
}

const getLotsByLotIds = async (lotIds: string[]): Promise<ILot[]> => {
  try {
    const lots = await Lots.find({ _id: { $in: lotIds } })
    return lots
  } catch (err) {
    throw new Error(`Error while fetching lots. Error: ${err.message}`)
  }
}

const saveLot = async (
  lot: Omit<ILot | ISubLot, '_id' | 'id' | 'createdAt' | 'lastUpdatedAt'>
): Promise<ILot | ISubLot> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('lotinfos').countDocuments({
      lotCategory: 'lot'
    })

    const countRecords = await db.collection('lotinfos').countDocuments()

    if (!lot.lotId) {
      lot.lotId = `L-${(Number(count) + 1).toString().padStart(3, '0')}`
      lot.lotName = `${lot.lotName}_${lot.lotId}`
    }

    const timestamp = new Date().toISOString()

    const result = await new Lots({
      ...lot,
      product: '645774053e1875e3bd793978', // TODO: make this dynamic product id
      lotId: lot.lotId,
      lotName: lot.lotName,
      id: Number(countRecords) + 1,
      createdAt: timestamp,
      lastUpdatedAt: timestamp
    }).save()

    return result as ILot
  } catch (err) {
    throw new Error(`Error while saving lot. Error: ${err.message}`)
  }
}

const updateLotColumnFields = async (lot: ILot): Promise<ILot> => {
  try {
    const timestamp = new Date().toISOString()

    const updatedLot = await Lots.findByIdAndUpdate(
      lot._id,
      {
        lotStatus: lot.lotStatus,
        modalFieldCombined: lot.modalFieldCombined,
        lastUpdatedAt: timestamp
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedLot) {
      throw new Error('Document not found')
    }

    return updatedLot as ILot
  } catch (err) {
    throw new Error('Error while updating lot column fields')
  }
}

const updateFarmerProduceIdsInLot = async (
  lotId: string,
  farmerProduceIds: string[]
): Promise<ILot> => {
  try {
    const updatedLot = await Lots.findByIdAndUpdate(
      lotId,
      {
        farmerProduceIds
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedLot) {
      throw new Error('Document not found')
    }
    return updatedLot as ILot
  } catch (err) {
    throw new Error(`Error while updating lot. Error: ${err?.message}`)
  }
}

const getAllLotCoCodes = async (req: any): Promise<LotListResponse> => {
  try {
    return await getlistData(req, Lots, LOT_PRE_DEFINED_FIELDS)
  } catch (err) {
    throw new Error(`Error while fetching lot co-codes: ${err.message}`)
  }
}

const getLotAggregations = async (
  req: any
): Promise<LotAggregationResponse> => {
  try {
    const aggregationFields = {
      isReadyForContainer: FIELD_TYPES.BOOLEAN,
      type: FIELD_TYPES.GROUPANDCOUNT,
      quantity: FIELD_TYPES.MINMAX,
      lotStatus: FIELD_TYPES.GROUPANDCOUNT
    }
    return await getAggregations(req, Lots, aggregationFields)
  } catch (err) {
    throw new Error(`Error while getting lot aggregations: ${err.message}`)
  }
}

const createNewLot = async (
  lotData: CreateLotData,
  batchIds: string[],
  unionCode: number
): Promise<ILot> => {
  try {
    let isReadyForContainer = false

    const modalFieldsArr = await getModalFields(
      '645774053e1875e3bd793978',
      'LOT'
    )

    const sortedModalFieldsArrByIndex = modalFieldsArr.modalFieldCombined.sort(
      (a, b) => {
        return a.index - b.index
      }
    )

    // Autofill lot modal fields
    sortedModalFieldsArrByIndex.forEach((modalFieldsArr) => {
      const fieldRules = LOT_FIELD_UPDATE_RULES[modalFieldsArr.columnName]
      if (fieldRules) {
        modalFieldsArr.fields.forEach((field) => {
          if (fieldRules[field.name]) {
            field.value = fieldRules[field.name](lotData)
          }
        })
      }
    })

    // Set column statuses
    const updatedModalFieldsArr = sortedModalFieldsArrByIndex.map(
      (obj, index, arr) => {
        if (index === 0 && obj.isOptional) {
          obj.columnStatus = 'ADD'
          const nextNonOptionalIndex = arr.findIndex(
            (item, i) => i > index && !item.isOptional
          )
          if (nextNonOptionalIndex !== -1) {
            arr[nextNonOptionalIndex].columnStatus = 'ADD'
          }
          return obj
        }

        if (index === 0) {
          obj.columnStatus = 'ADD'
          return obj
        }

        if (obj.columnStatus === 'ADD') {
          return obj
        }

        if (obj.isOptional) {
          obj.columnStatus = 'ADD'
          return obj
        }

        obj.columnStatus = 'NOTAPPLICABLE'
        return obj
      }
    )

    isReadyForContainer =
      updatedModalFieldsArr.length === 0 ||
      updatedModalFieldsArr.every(
        (field) =>
          field.isOptional === true || field.columnStatus === 'NOTAPPLICABLE'
      )

    const newLot: Omit<ILot, '_id' | 'id' | 'createdAt' | 'lastUpdatedAt'> = {
      productId: '645774053e1875e3bd793978', // TODO: make dynamic
      lotName: lotData.lotName,
      type: lotData.type || 'faq',
      coCode: lotData.coCode,
      ccCode: lotData.ccCode,
      unionCode: lotData.unionCode,
      quantity: lotData.quantity || 0,
      lotStatus: isReadyForContainer ? 'ready_for_container' : 'pending',
      lotCategory: 'lot',
      isSubLotCreated: false,
      isReadyForContainer,
      isDeleted: false,
      modalFieldCombined: updatedModalFieldsArr,
      batchIds,
      farmerProduceIds: [],
      flag: false,
      flagReason: [],
      note: null
    }

    return (await saveLot(newLot)) as ILot
  } catch (err) {
    throw new Error(`Error while creating new lot: ${err.message}`)
  }
}

const splitLot = async (
  lotId: string,
  lotData: SplitLotData
): Promise<ILot[]> => {
  try {
    const lot = await getLot(lotId)
    if (!lot) {
      throw new Error('Lot not found')
    }

    const modalFieldIndex = lot.modalFieldCombined.findIndex(
      (modalField) => modalField.modalFieldId === lotData.selectedModalFieldId
    )

    if (modalFieldIndex === -1) {
      throw new Error('Invalid modal field found')
    }

    const modalField = lot.modalFieldCombined[modalFieldIndex]

    modalField.fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(lotData.fields, field?.name)) {
        field.value = lotData.fields[field.name]
      }
    })
    modalField.lastUpdatedAt = new Date().toISOString()

    if (modalField.columnName === 'Grading Report') {
      const splitFieldNames = ['SC_18', 'SC_15', 'SC_12', 'all_bhp', 'UG']
      const fieldNamesToKey = {
        SC_18: 'SC18',
        SC_15: 'SC15',
        SC_12: 'SC12',
        all_bhp: 'BHP',
        UG: 'UG'
      }

      const splittedLots = Object.keys(lotData.fields)
        .filter((key) => splitFieldNames.includes(key))
        .map((key) => {
          const subLot: ISubLot = {
            ...lot,
            lotId: `${lot.lotId}_SL-${fieldNamesToKey[key]}`,
            lotName: `${lot.lotName}_SL-${fieldNamesToKey[key]}`,
            type: getSplitCoffeeType(key),
            lotStatus: 'ready_for_container',
            lotCategory: 'sub_lot',
            quantity: lotData.fields[key],
            isReadyForContainer: true,
            modalFieldCombined: lot.modalFieldCombined.map((field, idx) =>
              idx === modalFieldIndex
                ? { ...field, columnStatus: 'DONE' }
                : field
            )
          }

          delete subLot.createdAt
          delete subLot.lastUpdatedAt
          delete subLot.id
          delete subLot._id

          return subLot
        })

      lot.lotStatus = 'sub_lot_created'
      lot.isReadyForContainer = false
      lot.modalFieldCombined[modalFieldIndex].columnStatus = 'DONE'
      lot.isSubLotCreated = true

      await updateLotColumnFields(lot)

      const savedSplittedLots = []
      for (const subLot of splittedLots) {
        const savedLot = await saveLot(subLot)
        savedSplittedLots.push(savedLot)
      }

      return savedSplittedLots
    }

    throw new Error('Invalid column name for splitting')
  } catch (err) {
    throw new Error(`Error while splitting lot: ${err.message}`)
  }
}

const updateLot = async (
  lotId: string,
  lotData: UpdateLotData
): Promise<ILot> => {
  try {
    const lot = await getLot(lotId)
    if (!lot) {
      throw new Error('Lot not found')
    }

    let isReadyForContainer = false

    const findModalFieldIndex = lot.modalFieldCombined.findIndex(
      (modalField) => modalField.modalFieldId === lotData.selectedModalFieldId
    )

    if (findModalFieldIndex === -1) {
      throw new Error('Invalid modal field id found')
    }

    const lotModalFieldsArr = lot.modalFieldCombined.map((obj, index) => {
      if (index === findModalFieldIndex) {
        obj.columnStatus = lotData.fields.finalizeLotColumn ? 'DONE' : 'EDIT'
        obj.fields.forEach((field) => {
          if (
            Object.prototype.hasOwnProperty.call(lotData.fields, field?.name)
          ) {
            field.value = lotData.fields[field.name]
          }
        })
        obj.lastUpdatedAt = new Date().toISOString()
        return obj
      } else if (
        lotData.fields.finalizeLotColumn &&
        index === Number(findModalFieldIndex) + 1
      ) {
        if (!obj.isOptional) {
          obj.columnStatus = 'ADD'
        }

        index === lot.modalFieldCombined.length - 1 && !obj.isOptional
          ? (lot.lotStatus = 'container_created')
          : (lot.lotStatus = 'pending')

        return obj
      }
      return obj
    })

    lot.modalFieldCombined = lotModalFieldsArr

    isReadyForContainer = lotModalFieldsArr.every(
      (field) => field.columnStatus === 'DONE' || field.isOptional
    )

    lot.lotStatus = isReadyForContainer ? 'ready_for_container' : 'pending'
    lot.isReadyForContainer = isReadyForContainer

    return await updateLotColumnFields(lot)
  } catch (err) {
    throw new Error(`Error while updating lot: ${err.message}`)
  }
}

const deleteAllLots = async (): Promise<any> => {
  try {
    const deletedLots = await Lots.deleteMany({})
    return deletedLots
  } catch (err) {
    throw new Error('Error while deleting lots')
  }
}

export {
  getLot,
  getLotsByLotIds,
  saveLot,
  updateFarmerProduceIdsInLot,
  updateLotColumnFields,
  deleteAllLots,
  getAllLotCoCodes,
  getLotAggregations,
  createNewLot,
  splitLot,
  updateLot
}
