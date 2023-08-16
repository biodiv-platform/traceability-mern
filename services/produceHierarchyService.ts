import { ProduceHierarchy } from 'models'

export const getDataBasedOnCC = async (cc) => {
  const produceHierarchy = await ProduceHierarchy.findOne({
    collectionCenter: cc,
  })
  const { cooperative, union } = produceHierarchy

  return { cooperative, union }
}
