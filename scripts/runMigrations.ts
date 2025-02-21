import 'dotenv/config'
import mongoose from 'mongoose'
import migration from '../migrations/20240220_update_lot_status'

async function runMigration(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || '')
    console.log('Connected to MongoDB')

    // Run the migration
    await migration.up()
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    // Close the connection
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

runMigration()
