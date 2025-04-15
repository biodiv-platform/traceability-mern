import mongoose from 'mongoose'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

// Define collections and their respective status fields
const collectionsToUpdate = [
  { collectionName: 'batchinfos', statusField: 'batchStatus' },
  { collectionName: 'farmerproduceinfos', statusField: 'produceStatus' },
  { collectionName: 'lotinfos', statusField: 'lotStatus' },
  { collectionName: 'containerinfos', statusField: 'containerStatus' }
]

const Update_status_field = {
  async up(): Promise<void> {
    try {
      for (const { collectionName, statusField } of collectionsToUpdate) {
        const collection = mongoose.connection.collection(collectionName)

        // Fetch distinct status values
        const uniqueStatuses = await collection.distinct(statusField)

        // Loop through each unique value and update
        for (const status of uniqueStatuses) {
          if (typeof status === 'string') {
            const newStatus = status.toLowerCase().replace(/\s+/g, '_')

            // Only update if the new status is different
            if (newStatus !== status) {
              const result = (await collection.updateMany(
                { [statusField]: status },
                { $set: { [statusField]: newStatus } }
              )) as MigrationResult

              console.log(
                `Updated ${result.modifiedCount} documents in "${collectionName}" from "${status}" to "${newStatus}"`
              )
            }
          }
        }
      }

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

export default Update_status_field
