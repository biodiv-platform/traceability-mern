// migrations/20240220_update_lot_status.ts
import mongoose from 'mongoose'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

const Update_lot_status = {
  async up(): Promise<void> {
    // Get the collection directly for better performance with large datasets
    const collection = mongoose.connection.collection('lotinfos')

    try {
      const result = (await collection.updateMany(
        {
          lotStatus: {
            $in: ['AT_UNION', 'AT_CO_OPERATIVE']
          }
        },
        {
          $set: {
            lotStatus: 'pending'
          }
        }
      )) as MigrationResult

      console.log(`Updated ${result.modifiedCount} documents`)
      console.log('Migration completed successfully')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  },

  async down(): Promise<void> {
    console.warn('Warning: This migration cannot be fully reversed')
  }
}

export default Update_lot_status
