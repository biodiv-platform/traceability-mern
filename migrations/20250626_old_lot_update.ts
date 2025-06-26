import mongoose from 'mongoose'
import { Lots } from '../models'

interface MigrationResult {
  modifiedCount: number
  matchedCount: number
  upsertedCount: number
}

const lotIds = [
  '6638a351cfe064f219b3a72f',
  '6643055dcfe064f219b3ab8f',
  '6659863dcfe064f219b3b5da'
]

const fieldSequence = [
  'Title',
  'input_FAQ_weight',
  'input_FAQ_moisture_content',
  'SC_18',
  'SC_15',
  'SC_12',
  'all_bhp',
  'UG',
  'dust',
  'defects_various',
  'outturn',
  'output_moisture_content',
  'finalizeGradingReport'
]

const gradingModalIdIndex = 0 // assuming grading modal always first

const migrateOldCompletedLots = {
  async up(): Promise<void> {
    for (const lotId of lotIds) {
      const lot = await Lots.findOne({
        _id: new mongoose.Types.ObjectId(lotId)
      })
      if (!lot) {
        console.warn(`Lot ${lotId} not found`)
        continue
      }

      const gradingModal = lot.modalFieldCombined[gradingModalIdIndex]
      if (!gradingModal) {
        console.warn(`Grading modal missing for lot ${lotId}`)
        continue
      }

      const oldToNewNameMap: Record<string, string> = {
        screen_18_weight: 'SC_18',
        screen_15_weight: 'SC_15',
        screen_12_weight: 'SC_12',
        finalize_grading_report: 'finalizeGradingReport'
      }

      const renameField = (field: any): any => {
        const newName = oldToNewNameMap[field.name] || field.name
        const newField = { ...field, name: newName }

        switch (newName) {
          case 'input_FAQ_weight':
            return {
              ...newField,
              yupSchema: 'Yup.number().min(0.0001)',
              disabled: true
            }
          case 'input_FAQ_moisture_content':
            return {
              ...newField,
              label: 'Input FAQ moisture content (%)',
              yupSchema: 'Yup.number().min(0.0001)',
              required: false
            }
          case 'output_moisture_content':
            return {
              ...newField,
              label: 'Output moisture content (%)',
              yupSchema:
                'Yup.number().min(0.0001).max(input_FAQ_moisture_content)',
              required: false
            }
          case 'defects_various':
          case 'SC_18':
          case 'SC_15':
          case 'SC_12':
            return {
              ...newField,
              yupSchema: 'Yup.number().nullable()',
              required: false
            }
          default:
            return newField
        }
      }

      gradingModal.fields = gradingModal.fields.map(renameField)

      const getValue = (name: string): number =>
        Number(
          gradingModal.fields.find((f: any) => f.name === name)?.value ?? 0
        )

      const ensureField = (name: string, label: string, value: any = 0) => {
        if (!gradingModal.fields.find((f: any) => f.name === name)) {
          gradingModal.fields.push({
            fieldType: 'input',
            inputType: 'Number',
            value,
            width: 'FULL',
            label,
            name,
            yupSchema: 'Yup.number().nullable()',
            showPercent: true,
            percentBaseField: 'input_FAQ_weight',
            required: false
          })
        }
      }

      ensureField('all_bhp', 'All BHP')
      ensureField('UG', 'UnderGrades')
      ensureField('dust', 'Dust')

      const input = getValue('input_FAQ_weight')
      const denom =
        getValue('SC_18') +
        getValue('SC_15') +
        getValue('SC_12') +
        getValue('all_bhp') +
        getValue('dust')
      const outturn =
        input && denom ? parseFloat(((denom / input) * 100).toFixed(2)) : null

      const outturnField = {
        fieldType: 'input',
        inputType: 'Number',
        value: outturn,
        width: 'FULL',
        label: 'Outturn (%)',
        name: 'outturn',
        yupSchema: 'Yup.number().nullable()',
        disabled: true
      }

      const outturnIndex = gradingModal.fields.findIndex(
        (f: any) => f.name === 'outturn'
      )
      if (outturnIndex !== -1) {
        gradingModal.fields[outturnIndex] = outturnField
      } else {
        gradingModal.fields.push(outturnField)
      }

      gradingModal.fields = fieldSequence
        .map((name) =>
          gradingModal.fields.find(
            (f: any) => f.name === name || f.fieldType === name
          )
        )
        .filter(Boolean)

      lot.isReadyForContainer ??= false
      lot.isSubLotCreated ??= false

      await Lots.updateOne(
        { _id: new mongoose.Types.ObjectId(lotId) },
        {
          $set: {
            modalFieldCombined: lot.modalFieldCombined,
            isReadyForContainer: lot.isReadyForContainer,
            isSubLotCreated: lot.isSubLotCreated
          }
        }
      )

      console.log(`✅ Migrated lot: ${lot.lotName}`)
    }
  },

  async down(): Promise<void> {
    for (const lotId of lotIds) {
      const lot = await Lots.findOne({
        _id: new mongoose.Types.ObjectId(lotId)
      })
      if (!lot) {
        console.warn(`Lot ${lotId} not found`)
        continue
      }

      const gradingModal = lot.modalFieldCombined[gradingModalIdIndex]
      if (!gradingModal) {
        console.warn(`Grading modal missing for lot ${lotId}`)
        continue
      }

      const revertNameMap: Record<string, string> = {
        SC_18: 'screen_18_weight',
        SC_15: 'screen_15_weight',
        SC_12: 'screen_12_weight',
        finalizeGradingReport: 'finalize_grading_report'
      }

      gradingModal.fields = gradingModal.fields
        .map((f: any) => {
          if (
            f.name === 'outturn' ||
            f.name === 'all_bhp' ||
            f.name === 'UG' ||
            f.name === 'dust'
          )
            return null
          const originalName = revertNameMap[f.name] || f.name
          return { ...f, name: originalName }
        })
        .filter(Boolean)

      gradingModal.columnStatus = 'DONE'
      delete lot.isReadyForContainer
      delete lot.isSubLotCreated

      await Lots.updateOne(
        { _id: new mongoose.Types.ObjectId(lotId) },
        {
          $set: {
            modalFieldCombined: lot.modalFieldCombined
          },
          $unset: {
            isReadyForContainer: '',
            isSubLotCreated: ''
          }
        }
      )

      console.log(`↩️ Rolled back lot: ${lot.lotName}`)
    }
  }
}

export default migrateOldCompletedLots
