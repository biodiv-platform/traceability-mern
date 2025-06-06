// migrations/20250605_migrate_lot_schema.ts
import { FieldType, ModalField } from '../interfaces/traceability'
import mongoose from 'mongoose'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

interface LotDocument {
  _id: mongoose.Types.ObjectId
  quantity: number
  modalFieldCombined: ModalField[]
  lotStatus: string
  [key: string]: any
}

const Migrate_lot_schema_for_split = {
  async up(): Promise<void> {
    const collection = mongoose.connection.collection('lotinfos')

    try {
      console.log('Starting lot schema migration...')

      // Step 1: Find old lots that need migration
      const oldLotsQuery = {
        $and: [
          { isSubLotCreated: { $exists: false } },
          { isDeleted: false },
          {
            modalFieldCombined: {
              $elemMatch: {
                columnStatus: 'ADD',
                columnName: 'Grading Report'
              }
            }
          }
        ]
      }

      const oldLots = await collection.find(oldLotsQuery).toArray()
      console.log(`Found ${oldLots.length} lots to migrate`)

      if (oldLots.length === 0) {
        console.log('No lots need migration')
        return
      }

      // Step 2: Field name mapping
      const fieldNameMapping: Record<string, string> = {
        screen_18_weight: 'SC_18',
        screen_15_weight: 'SC_15',
        screen_12_weight: 'SC_12',
        finalize_grading_report: 'finalizeGradingReport'
      }

      // Step 3: New fields to add
      const newFields: FieldType[] = [
        {
          fieldType: 'input',
          inputType: 'Number',
          value: null,
          width: 'FULL',
          label: 'All BHP',
          name: 'all_bhp',
          yupSchema: 'Yup.number().nullable()',
          showPercent: true,
          percentBaseField: 'input_FAQ_weight'
        },
        {
          fieldType: 'input',
          inputType: 'Number',
          value: null,
          width: 'FULL',
          label: 'UnderGrades',
          name: 'UG',
          yupSchema: 'Yup.number().nullable()',
          showPercent: true,
          percentBaseField: 'input_FAQ_weight'
        },
        {
          fieldType: 'input',
          inputType: 'Number',
          value: null,
          width: 'FULL',
          label: 'Dust',
          name: 'dust',
          yupSchema: 'Yup.number().nullable()',
          showPercent: true,
          percentBaseField: 'input_FAQ_weight'
        },
        {
          fieldType: 'input',
          inputType: 'Number',
          value: null,
          width: 'FULL',
          label: 'Outturn (%)',
          name: 'outturn',
          yupSchema: 'Yup.number().nullable()',
          disabled: true
        }
      ]

      // Step 4: Transform function
      const transformModalFields = (
        modalFieldCombined: ModalField[],
        lotQuantity: number
      ): ModalField[] => {
        return modalFieldCombined.map((modal) => {
          // Only transform modal fields with columnStatus "ADD"
          if (
            modal.columnStatus !== 'ADD' ||
            modal.columnName !== 'Grading Report'
          ) {
            console.log(
              `Skipping modal field "${modal.columnName}" with status: ${modal.columnStatus}`
            )
            return modal // Return unchanged
          }
          // Define the desired field sequence
          const fieldSequence = [
            'Title',
            'input_FAQ_weight',
            'input_FAQ_moisture_content',
            'SC_18', // screen_18_weight -> SC_18
            'SC_15', // screen_15_weight -> SC_15
            'SC_12', // screen_12_weight -> SC_12
            'all_bhp',
            'UG',
            'dust',
            'defects_various',
            'outturn',
            'output_moisture_content',
            'finalizeGradingReport' // finalize_grading_report -> finalizeGradingReport
          ]

          // Transform existing fields
          const transformedFields = modal.fields.map((field) => {
            // Handle input_FAQ_weight special case
            if (field.name === 'input_FAQ_weight') {
              return {
                ...field,
                value: lotQuantity,
                disabled: true,
                yupSchema: 'Yup.number().min(0.0001)',
                required: true
              }
            }

            // Handle moisture content labels and validation
            if (field.name === 'input_FAQ_moisture_content') {
              return {
                ...field,
                label: 'Input FAQ moisture content (%)',
                yupSchema: 'Yup.number().min(0.0001)',
                required: false
              }
            }

            if (field.name === 'output_moisture_content') {
              return {
                ...field,
                label: 'Output moisture content (%)'
              }
            }

            // Update field names using mapping
            const newName = fieldNameMapping[field.name] || field.name

            // Handle screen weight fields - convert to new schema
            if (
              [
                'screen_18_weight',
                'screen_15_weight',
                'screen_12_weight'
              ].includes(field.name)
            ) {
              return {
                ...field,
                name: newName,
                value: field.value === '' ? null : field.value,
                yupSchema: 'Yup.number().nullable()',
                required: false
              }
            }

            // Handle defects_various
            if (field.name === 'defects_various') {
              return {
                ...field,
                value: field.value === '' ? null : field.value,
                yupSchema: 'Yup.number().nullable()',
                required: false
              }
            }

            // Handle finalize fields
            if (field.name && field.name.startsWith('finalize_')) {
              return {
                ...field,
                name: newName
              }
            }

            return { ...field, name: newName }
          })

          // Create a map of existing fields by name for easy lookup
          const fieldMap = new Map()
          transformedFields.forEach((field) => {
            const fieldName =
              field.fieldType === 'Title' ? 'Title' : field.name || 'unknown'
            fieldMap.set(fieldName, field)
          })

          // Add new fields to the map
          newFields.forEach((field) => {
            if (!fieldMap.has(field.name)) {
              fieldMap.set(field.name, field)
            }
          })

          // Build final fields array in the correct sequence
          const finalFields: FieldType[] = []

          fieldSequence.forEach((fieldName) => {
            if (fieldMap.has(fieldName)) {
              finalFields.push(fieldMap.get(fieldName))
            }
          })

          // Add any remaining fields that weren't in the sequence (fallback)
          fieldMap.forEach((field, fieldName) => {
            if (!fieldSequence.includes(fieldName)) {
              const existingFieldName =
                field.fieldType === 'Title' ? 'Title' : field.name || 'unknown'
              if (
                !finalFields.find(
                  (f) =>
                    (f.fieldType === 'Title'
                      ? 'Title'
                      : f.name || 'unknown') === existingFieldName
                )
              ) {
                finalFields.push(field)
              }
            }
          })

          return {
            ...modal,
            fields: finalFields
          }
        })
      }

      // Step 5: Prepare bulk operations
      const bulkOps = oldLots.map((lot: LotDocument) => {
        const transformedModalFields = transformModalFields(
          lot.modalFieldCombined,
          lot.quantity
        )

        return {
          updateOne: {
            filter: { _id: lot._id },
            update: {
              $set: {
                isReadyForContainer: lot.lotStatus === 'ready_for_container',
                isSubLotCreated: false,
                modalFieldCombined: transformedModalFields,
                lastUpdatedAt: new Date()
              }
            }
          }
        }
      })

      // Step 6: Execute migration in batches
      const batchSize = 100
      let totalModified = 0

      for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize)
        const result = (await collection.bulkWrite(batch)) as any
        totalModified += result.modifiedCount
        console.log(
          `Migrated batch ${Math.floor(i / batchSize) + 1}: ${
            result.modifiedCount
          } lots updated`
        )
      }

      console.log(
        `Migration completed successfully. Total lots migrated: ${totalModified}`
      )

      // Step 7: Verification
      const verificationCount = await collection.countDocuments({
        isReadyForContainer: { $exists: true },
        isSubLotCreated: { $exists: true }
      })

      console.log(
        `Verification: ${verificationCount} lots now have new schema fields`
      )
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  },

  async down(): Promise<void> {
    const collection = mongoose.connection.collection('lotinfos')

    try {
      console.log('Starting rollback of lot schema migration...')

      // Find migrated lots
      const migratedLots = await collection
        .find({
          isReadyForContainer: { $exists: true },
          isSubLotCreated: { $exists: true }
        })
        .toArray()

      console.log(`Found ${migratedLots.length} migrated lots to rollback`)

      if (migratedLots.length === 0) {
        console.log('No lots to rollback')
        return
      }

      // Remove new fields from root level
      const result = (await collection.updateMany(
        {
          isReadyForContainer: { $exists: true },
          isSubLotCreated: { $exists: true }
        },
        {
          $unset: {
            isReadyForContainer: '',
            isSubLotCreated: ''
          }
        }
      )) as MigrationResult

      console.log(`Rollback completed: ${result.modifiedCount} lots updated`)
      console.log(
        'Warning: modalFieldCombined changes cannot be automatically reversed'
      )
      console.log(
        'Manual restoration from backup may be required for complete rollback'
      )
    } catch (error) {
      console.error('Rollback failed:', error)
      throw error
    }
  }
}

export default Migrate_lot_schema_for_split
