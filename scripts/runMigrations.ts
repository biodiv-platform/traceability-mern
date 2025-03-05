import 'dotenv/config'
import mongoose from 'mongoose'
import { createInterface } from 'readline'
import * as migrations from '../migrations' // Importing from index.ts

// Convert migrations object into an array
const migrationKeys = Object.keys(migrations)

if (migrationKeys.length === 0) {
  console.log('No migrations found.')
  process.exit(1)
}

// Display available migrations
console.log('Available Migrations:')
migrationKeys.forEach((key, index) => {
  console.log(`${index + 1}. ${key}`)
})

// Setup user input interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('Enter the number of the migration to run: ', async (answer) => {
  const selectedIndex = parseInt(answer, 10) - 1

  if (selectedIndex >= 0 && selectedIndex < migrationKeys.length) {
    const selectedMigrationKey = migrationKeys[selectedIndex]
    const selectedMigration = migrations[selectedMigrationKey]

    console.log(`Running migration: ${selectedMigrationKey}`)

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGO_URI || '')
      console.log('Connected to MongoDB')

      // Run the selected migration
      await selectedMigration.up()
      console.log('Migration completed successfully.')
    } catch (error) {
      console.error('Migration failed:', error)
    } finally {
      // Close the connection
      await mongoose.disconnect()
      console.log('Disconnected from MongoDB')
      process.exit(0)
    }
  } else {
    console.log('Invalid selection. Please enter a valid number.')
    process.exit(1)
  }
})
