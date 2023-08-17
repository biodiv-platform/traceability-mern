import { ProduceHierarchy } from 'models'

const getDataBasedOnCC = async (cc) => {
  const produceHierarchy = await ProduceHierarchy.findOne({
    collectionCenter: cc,
  })
  const { cooperative, union } = produceHierarchy

  return { cooperative, union }
}

const createProduceHierarchy = async (value) => {
  try {
    const newProduceHierarchy = await ProduceHierarchy.create(value)
    return newProduceHierarchy
  } catch (err) {
    console.error(err)
  }
}

export { getDataBasedOnCC, createProduceHierarchy }
