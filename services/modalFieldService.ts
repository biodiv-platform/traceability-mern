import { ModalField } from '../models'

const getModalFields = async (
  productId: string,
  fieldsOf: string
): Promise<any> => {
  const modalFields = await ModalField.find({
    product: productId,
    fieldsOf,
  })

  // reduce the array of fields to a single object
  const result = modalFields.reduce(
    (acc: { modalFieldCombined: any[] }, obj: any) => {
      const newObj = JSON.parse(JSON.stringify(obj))
      const modalFieldId = newObj._id
      delete newObj._id
      acc.modalFieldCombined.push({ modalFieldId, ...newObj })
      return acc
    },
    { modalFieldCombined: [] }
  )

  return result
}

const updateDocInDB = async (doc: {
  _id: string
  index: number
}): Promise<any> => {
  try {
    await ModalField.updateOne({ _id: doc._id }, { $set: { index: doc.index } })
  } catch (err) {
    console.error(err)
  }
}

const createModalField = async (value: any): Promise<any> => {
  try {
    console.log('value \n -------------', value)
    const newModalField = await ModalField.create(value)
    return newModalField
  } catch (err) {
    console.error(err)
  }
}

const getAllModalFields = async (): Promise<any[]> => {
  try {
    const modalFields = await ModalField.find().lean()
    return modalFields
  } catch (err) {
    console.error(err)
  }
}

const addStepAndModifyArrIndex = async (
  index: number,
  value: any,
  newItem = false
): Promise<any[]> => {
  try {
    if (value.fieldsOf !== 'LOT' && value.fieldsOf !== 'BATCH') {
      throw new Error('Invalid value for fieldsOf property')
    }

    let newModalField = value
    if (newItem) {
      newModalField = await createModalField(value)
      console.log('newItem created \n \n \n --------------------')
      console.log(newModalField)
    }

    // Get all modalFields from database
    const modalFields = await getAllModalFields()

    // Filter the array based on "fieldsOf" property equals "LOT"
    const filteredArr = modalFields.filter(
      (doc: { fieldsOf: any }) => doc.fieldsOf === newModalField.fieldsOf
    )

    console.log('filteredArr', filteredArr)

    if (index < 0 || index > filteredArr.length) {
      throw new Error('Index out of bounds')
    }

    // Insert the newModalField object at the specified index in the filtered array
    filteredArr.splice(index, 0, newModalField)

    // Update the indices for the filtered array
    filteredArr.forEach((doc: { index: any }, idx: any) => {
      doc.index = idx
    })

    // TODO: Update the individual documents of modalFields in the database
    filteredArr.forEach((doc: any) => {
      void updateDocInDB(doc)
    })

    return filteredArr // Return the modified array
  } catch (err) {
    console.error(err)
  }
}

export { getModalFields, addStepAndModifyArrIndex }
