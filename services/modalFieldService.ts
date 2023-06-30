import { json } from 'stream/consumers'
import { ModalField } from '../models'

const getModalFields = async (productId: string, fieldsOf: string) => {
  const modalFields = await ModalField.find({
    product: productId,
    fieldsOf
  })

  // reduce the array of fields to a single object
  const result = modalFields.reduce(
    (acc, obj) => {
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

export { getModalFields }
