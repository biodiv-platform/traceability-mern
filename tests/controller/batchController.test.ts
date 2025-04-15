import { Batches } from '../../models'
import mongoose from 'mongoose'
import { getBatch, getBatchesByBatchIds } from '../../services'

describe('Batch API Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear mocks before each test
  })

  // Successfully retrieve batch when valid batchId is provided
  it('should return batch data when valid batchId is provided', async () => {
    const mockBatchId = new mongoose.Types.ObjectId().toString()
    const mockBatchData = {
      _id: mockBatchId,
      name: 'Test Batch'
    }

    jest.spyOn(Batches, 'findById').mockResolvedValue(mockBatchData)

    const result = await getBatch(mockBatchId)

    expect(Batches.findById).toHaveBeenCalledWith(mockBatchId)
    expect(result).toEqual(mockBatchData)
  })

  // Successfully retrieve multiple batches when valid batch IDs are provided
  it('should return multiple batches when valid batch IDs are provided', async () => {
    const mockBatches = [
      { _id: new mongoose.Types.ObjectId(), batchNumber: 'BATCH-001' },
      { _id: new mongoose.Types.ObjectId(), batchNumber: 'BATCH-002' }
    ]

    const batchIds = mockBatches.map((batch) => batch._id.toString())

    jest.spyOn(Batches, 'find').mockResolvedValue(mockBatches)

    const result = await getBatchesByBatchIds(batchIds)

    expect(Batches.find).toHaveBeenCalledWith({
      _id: { $in: batchIds }
    })

    expect(result).toEqual(mockBatches)
  })
})
