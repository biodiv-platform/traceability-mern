import mongoose, { Types } from 'mongoose'

const AddAmountPaidCalculateReverse = {
  async up(): Promise<void> {
    try {
      const lotCollection = mongoose.connection.collection('lotinfos')
      const batchCollection = mongoose.connection.collection('batchinfos')
      const produceCollection =
        mongoose.connection.collection('farmerproduceinfos')
      const containerCollection =
        mongoose.connection.collection('containerinfos')

      const allLots = await lotCollection.find({}).toArray()

      for (const lot of allLots) {
        if (
          lot.lotCategory === 'sub_lot' ||
          lot.lotCategory === 'remaining_lot'
        ) {
          await lotCollection.updateOne(
            { _id: lot._id },
            { $set: { amountPaidCalculate: null } }
          )
          console.log(
            `Set lot ${lot._id} amountPaidCalculate = null (category: ${lot.lotCategory})`
          )
          continue
        }

        let lotTotal = 0

        for (const batchId of lot.batchIds || []) {
          try {
            const objectId = new Types.ObjectId(batchId)
            const batch = await batchCollection.findOne({ _id: objectId })
            if (!batch) continue

            const produceIds = batch.farmerProduceIds || []
            if (!produceIds.length) continue

            const produceObjectIds = produceIds
              .filter(Boolean)
              .map((id) => new Types.ObjectId(id))

            const produceDocs = await produceCollection
              .find({ _id: { $in: produceObjectIds } })
              .project({ amountPaidCalculate: 1 })
              .toArray()

            const batchTotal = produceDocs.reduce(
              (sum, p) => sum + (p.amountPaidCalculate || 0),
              0
            )

            await batchCollection.updateOne(
              { _id: objectId },
              { $set: { amountPaidCalculate: batchTotal } }
            )

            lotTotal += batchTotal
          } catch (err) {
            console.warn(`Invalid batchId: ${batchId} - skipping`)
            continue
          }
        }

        await lotCollection.updateOne(
          { _id: lot._id },
          { $set: { amountPaidCalculate: lotTotal } }
        )

        console.log(`Updated lot ${lot._id} with total = ${lotTotal}`)
      }

      // Second pass for batches without amountPaidCalculate
      const batchesWithoutAmount = await batchCollection
        .find({ amountPaidCalculate: { $exists: false } })
        .toArray()

      for (const batch of batchesWithoutAmount) {
        const produceIds = batch.farmerProduceIds || []
        if (!produceIds.length) continue

        const produceObjectIds = produceIds
          .filter(Boolean)
          .map((id) => new Types.ObjectId(id))

        const produceDocs = await produceCollection
          .find({ _id: { $in: produceObjectIds } })
          .project({ amountPaidCalculate: 1 })
          .toArray()

        const batchTotal = produceDocs.reduce(
          (sum, p) => sum + (p.amountPaidCalculate || 0),
          0
        )

        await batchCollection.updateOne(
          { _id: batch._id },
          { $set: { amountPaidCalculate: batchTotal } }
        )

        console.log(`Backfilled batch ${batch._id} with total = ${batchTotal}`)
      }

      // Now update containers with sum of amountPaidCalculate from lots
      const allContainers = await containerCollection.find({}).toArray()

      for (const container of allContainers) {
        const lotIds = container.lotIds || []
        const lotObjectIds = lotIds
          .filter(Boolean)
          .map((id) => new Types.ObjectId(id))

        const lots = await lotCollection
          .find({ _id: { $in: lotObjectIds } })
          .project({ amountPaidCalculate: 1 })
          .toArray()

        let containerTotal: number | null = 0
        for (const lot of lots) {
          if (lot.amountPaidCalculate == null) {
            containerTotal = null
            break
          }
          containerTotal! += lot.amountPaidCalculate
        }

        await containerCollection.updateOne(
          { _id: container._id },
          { $set: { amountPaidCalculate: containerTotal } }
        )

        console.log(
          `Updated container ${container._id} with total = ${containerTotal}`
        )
      }

      console.log('Migration completed successfully')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  },

  async down(): Promise<void> {
    try {
      const lotCollection = mongoose.connection.collection('lotinfos')
      const batchCollection = mongoose.connection.collection('batchinfos')
      const containerCollection =
        mongoose.connection.collection('containerinfos')

      await lotCollection.updateMany(
        {},
        { $unset: { amountPaidCalculate: '' } }
      )
      await batchCollection.updateMany(
        {},
        { $unset: { amountPaidCalculate: '' } }
      )
      await containerCollection.updateMany(
        {},
        { $unset: { amountPaidCalculate: '' } }
      )

      console.log(
        'Removed amountPaidCalculate from lots, batches, and containers'
      )
    } catch (error) {
      console.error('Rollback failed:', error)
      throw error
    }
  }
}

export default AddAmountPaidCalculateReverse
