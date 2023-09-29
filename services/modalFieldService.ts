import { ModalField } from '../models'

const getModalFields = async (
  productId: string,
  fieldsOf: string
): Promise<any> => {
  const modalFields = await ModalField.find({
    product: productId,
    fieldsOf
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

const updateModalFieldIndex = async (
  newIndex: number,
  newModalField: any
): Promise<any[]> => {
  try {
    if (
      newModalField.fieldsOf !== 'LOT' &&
      newModalField.fieldsOf !== 'BATCH'
    ) {
      throw new Error('Invalid value for fieldsOf property')
    }

    // Get all modalFields from database
    let modalFields = await getAllModalFields()

    // check if newModalField is already in the database
    const isAlreadyInDB = modalFields.some(
      (doc) => doc._id.toString() === newModalField._id.toString()
    )

    // If newModalField is not in the database, throw an error
    if (!isAlreadyInDB) {
      void createModalField(newModalField)
      modalFields = await getAllModalFields()
      throw new Error(
        'ModalField is not in the database, please create it first'
      )
    }

    // Filter the array based on "fieldsOf" property equals "LOT"
    const filteredArr = modalFields.filter(
      (doc: { fieldsOf: any }) =>
        doc.fieldsOf.toString() === newModalField.fieldsOf.toString()
    )

    if (newIndex < 0 || newIndex > filteredArr.length) {
      throw new Error('Index out of bounds')
    }

    const currentIndex = filteredArr.findIndex(
      (doc: { _id: any }) => doc._id.toString() === newModalField._id.toString()
    )

    // Remove the element from the original index
    filteredArr.splice(currentIndex, 1)

    // Insert the element at the new index
    filteredArr.splice(newIndex, 0, newModalField)

    // Update the indices for the filtered array
    filteredArr.forEach((doc, idx) => {
      doc.index = idx
    })

    // Update the individual documents of modalFields in the database
    await Promise.all(
      filteredArr.map(async (doc: any) => await updateDocInDB(doc))
    )

    return filteredArr // Return the modified array
  } catch (err) {
    console.error(err)
  }
}

export { getModalFields, updateModalFieldIndex, createModalField }
