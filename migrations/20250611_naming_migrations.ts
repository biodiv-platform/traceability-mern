import mongoose from 'mongoose'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

const NamingMigration = {
  async up(): Promise<void> {
    try {
      const updates = [
        {
          collectionName: 'batchinfos',
          nameField: 'batchName',
          idField: 'batchId',
          prefix: 'BUZ_F_'
        },
        {
          collectionName: 'lotinfos',
          nameField: 'lotName',
          idField: 'lotId',
          prefix: 'BUZ_F_'
        },
        {
          collectionName: 'containerinfos',
          nameField: 'containerName',
          idField: 'containerId',
          prefix: 'BUZ_F_'
        }
      ]

      for (const { collectionName, nameField, idField, prefix } of updates) {
        const collection = mongoose.connection.collection(collectionName)

        const documents = await collection.find({}).toArray()

        for (const doc of documents) {
          const id = doc[idField]

          if (!id) {
            console.warn(
              `Skipping document in ${collectionName} missing ${idField}`
            )
            continue
          }

          const newName = `${prefix}${id}`
          const oldName = doc[nameField]

          if (oldName !== newName) {
            const result = (await collection.updateOne(
              { _id: doc._id },
              { $set: { [nameField]: newName } }
            )) as MigrationResult

            if (result.modifiedCount > 0) {
              console.log(
                `Updated ${collectionName}: "${oldName}" -> "${newName}"`
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
    console.warn(
      'This migration cannot be reversed. Old names were not preserved.'
    )
  }
}

export default NamingMigration
