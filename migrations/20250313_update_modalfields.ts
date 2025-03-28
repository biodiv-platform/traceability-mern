import mongoose from 'mongoose'

const collectionsToUpdate = [
  {
    collectionName: 'lotinfos',
    columnConfigs: [
      {
        columnName: 'Grading Report',
        confirmationFieldName: 'finalize_grading_report',
        confirmationFieldLabel: 'Finalize Grading Report'
      },
      {
        columnName: 'Cupping Report',
        confirmationFieldName: 'finalize_cupping_report',
        confirmationFieldLabel: 'Finalize Cupping Report'
      }
    ]
  },
  {
    collectionName: 'batchinfos',
    columnConfigs: [
      {
        columnName: 'Grading Report',
        confirmationFieldName: 'finalize_milling_report',
        confirmationFieldLabel: 'Finalize Milling Report'
      }
    ]
  }
]

const AddConfirmationAndPercentBaseField = {
  async up(): Promise<void> {
    try {
      for (const { collectionName, columnConfigs } of collectionsToUpdate) {
        const collection = mongoose.connection.collection(collectionName)
        const documents = await collection.find({}).toArray()

        console.log(`Updating documents in "${collectionName}"`)
        console.log(`Found ${documents.length} documents`)

        for (const doc of documents) {
          let modified = false

          console.log(`Updating document ${doc._id}`)

          if (Array.isArray(doc.modalFieldCombined)) {
            for (const modalField of doc.modalFieldCombined) {
              if (Array.isArray(modalField.fields)) {
                // Iterate through fields to add `percentBaseField`
                console.log(`Updating modal field ${modalField.columnName}`)
                modalField.fields.forEach((field) => {
                  if (field.showPercent === true && !field.percentBaseField) {
                    console.log({ field })
                    field.percentBaseField = 'input_FAQ_weight'
                    modified = true
                  }
                })

                // Add confirmation field based on column name
                const columnConfig = columnConfigs.find(
                  (cfg) => cfg.columnName === modalField.columnName
                )
                if (columnConfig) {
                  const confirmationField = {
                    fieldType: 'confirmCheckBoxField',
                    label: columnConfig.confirmationFieldLabel,
                    name: columnConfig.confirmationFieldName,
                    required: true
                  }

                  const alreadyExists = modalField.fields.some(
                    (field) => field.name === confirmationField.name
                  )

                  if (!alreadyExists) {
                    modalField.fields.push(confirmationField)
                    modified = true
                  }
                }
              }
            }
          }

          if (modified) {
            await collection.updateOne(
              { _id: doc._id },
              { $set: { modalFieldCombined: doc.modalFieldCombined } }
            )
            console.log(`Updated document ${doc._id} in "${collectionName}"`)
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

export default AddConfirmationAndPercentBaseField
