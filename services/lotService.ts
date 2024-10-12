import { type ILot } from 'interfaces/traceability'
import { Lots } from '../models'
import mongoose from 'mongoose'

const getLot = async (lotId: string): Promise<ILot | null> => {
  try {
    const lot = await Lots.findById(lotId).exec()
    return lot
  } catch (err) {
    throw new Error(`Error while fetching lot. Error: ${err.message}`)
  }
}

const saveLot = async (lot: ILot): Promise<ILot> => {
  try {
    const db = mongoose.connection

    const count = await db.collection('lotinfos').countDocuments()
    const lotId = (Number(count) + 1).toString().padStart(3, '0')

    const timestamp = new Date().toISOString()

    const result = await new Lots({
      product: '645774053e1875e3bd793978', // TODO: make this dynamic product id
      lotId,
      createdAt: lot.createdAt || timestamp,
      ...lot
    }).save()

    // update lotname with lotID
    const renamedLot = `${result.lotName}_${result.lotId}`

    const updatedLotName = await Lots.findByIdAndUpdate(
      result._id,
      {
        lotName: renamedLot
      },
      {
        new: true,
        runValidators: true
      }
    ).exec()

    return updatedLotName as ILot
  } catch (err) {
    throw new Error(`Error while saving lot. Error: ${err.message}`)
  }
}

const updateLotColumnFields = async (lot: ILot): Promise<ILot> => {
  try {
    // code to update document in mongodb

    const updatedBatch = await Lots.findByIdAndUpdate(
      lot._id,
      {
        lotStatus: lot.lotStatus,
        // isReadyForLot: lot.isReadyForLot,
        modalFieldCombined: lot.modalFieldCombined
      },
      { new: true, runValidators: true }
    ).exec()

    if (!updatedBatch) {
      throw new Error('Document not found')
    }

    return updatedBatch as ILot
  } catch (err) {
    throw new Error('Error while updating lot column fields')
  }
}

const updateFarmerProduceIdsInLot = async (
  lotId: string,
  farmerProduceIds: string[]
): Promise<ILot> => {
  try {
    // code to update document in mongodb

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
  saveLot,
  updateFarmerProduceIdsInLot,
  updateLotColumnFields,
  deleteAllLots
}
