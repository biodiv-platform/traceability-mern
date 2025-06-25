import { Lots } from '../models'
import mongoose from 'mongoose'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

const LotModalFieldStatusMigration = {
  async up(): Promise<void> {
    try {
      const containerCollection =
        mongoose.connection.collection('containerinfos')
      const lotCollection = mongoose.connection.collection('lotinfos')

      const containers = await containerCollection.find({}).toArray()

      for (const container of containers) {
        const lotIds: mongoose.Types.ObjectId[] = container.lotIds || []
        for (const lotId of lotIds) {
          const lot = await Lots.findOne({ _id: lotId })

          if (!lot || !Array.isArray(lot.modalFieldCombined)) {
            console.warn(
              `Skipping lot ${lotId}: no modalFieldCombined or not found`
            )
            continue
          }

          let modified = false

          const updatedModalFieldCombined = lot.modalFieldCombined.map(
            (modal: any) => {
              if (modal.columnStatus === 'ADD') {
                modal.columnStatus = 'NOTAPPLICABLE'
                modified = true
              }
              return modal
            }
          )

          if (modified) {
            const result = (await lotCollection.updateOne(
              { _id: lot._id },
              { $set: { modalFieldCombined: updatedModalFieldCombined } }
            )) as MigrationResult

            if (result.modifiedCount > 0) {
              console.log(
                `Updated lot ${lotId}: columnStatus changed from "ADD" to "NOTAPPLICABLE"`
              )
            }
          }
        }
      }

      console.log('LotModalFieldStatusMigration completed successfully')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  },

  async down(): Promise<void> {
    console.warn(
      'This migration is not reversible as original statuses were not stored.'
    )
  }
}

export default LotModalFieldStatusMigration
