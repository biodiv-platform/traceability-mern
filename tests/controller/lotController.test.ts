import { getLot, saveLot } from '../../services'
import { Lots } from '../../models'
import mongoose from 'mongoose'
import { type ILot } from 'interfaces/traceability'

describe('Lot API Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear mocks before each test
  })

  // Successfully retrieve lot by valid ID and return complete ILot object
  it('should return complete lot object when valid ID is provided', async () => {
    const mockLot: ILot = {
      _id: '507f1f77bcf86cd799439011',
      productId: 'prod123',
      lotName: 'test-lot',
      type: 'faq',
      coCode: [1, 2],
      ccCode: [3, 4],
      unionCode: 5,
      quantity: 100,
      lotStatus: 'pending',
      modalFieldCombined: [],
      lotId: 'L123',
      batchIds: [],
      farmerProduceIds: [],
      flag: false,
      flagReason: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      isDeleted: false,
      note: null,
      id: 1,
      isReadyForContainer: false,
      isSubLotCreated: false
    }

    jest.spyOn(Lots, 'findById').mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockLot)
    })

    const result = await getLot('507f1f77bcf86cd799439011')

    expect(result).toEqual(mockLot)
    expect(Lots.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
  })

  // Handle invalid/malformed MongoDB ObjectId format
  it('should throw error when invalid MongoDB ObjectId is provided', async () => {
    const invalidId = 'invalid-id'

    jest.spyOn(Lots, 'findById').mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('Invalid ObjectId format'))
    })

    await expect(getLot(invalidId)).rejects.toThrow(
      'Error while fetching lot. Error: Invalid ObjectId format'
    )
    expect(Lots.findById).toHaveBeenCalledWith(invalidId)
  })

  // Successfully saves new lot with auto-generated lotId and timestamp
  // it('should save lot with auto-generated lotId and update lotName', async () => {
  //   const mockLot: ILot = {
  //     _id: '507f1f77bcf86cd799439011',
  //     productId: 'prod123',
  //     lotName: 'test-lot',
  //     type: 'raw',
  //     coCode: [1, 2],
  //     ccCode: [3, 4],
  //     unionCode: 5,
  //     quantity: 100,
  //     lotStatus: 'ready_for_container',
  //     modalFieldCombined: [],
  //     lotId: 'L123',
  //     batchIds: [],
  //     farmerProduceIds: [],
  //     flag: false,
  //     flagReason: [],
  //     createdAt: new Date(),
  //     lastUpdatedAt: new Date(),
  //     isDeleted: false,
  //     note: null,
  //     id: 1,
  //     isReadyForContainer: false
  //   }

  //   const mockCount = 5
  //   const expectedLotId = 'L-006'

  //   const mockCollection = {
  //     countDocuments: jest.fn().mockResolvedValue(mockCount)
  //   }

  //   const mockConnection = {
  //     collection: jest.fn().mockReturnValue(mockCollection)
  //   }

  //   jest
  //     .spyOn(mongoose, 'connection', 'get')
  //     .mockReturnValue(mockConnection as any)

  //   const mockSavedLot = {
  //     ...mockLot,
  //     _id: new mongoose.Types.ObjectId(),
  //     lotId: expectedLotId
  //   }

  //   jest.spyOn(Lots.prototype, 'save').mockResolvedValue(mockSavedLot)

  //   jest.spyOn(Lots, 'findByIdAndUpdate').mockResolvedValue({
  //     ...mockSavedLot,
  //     lotName: `TestLot_${expectedLotId}`
  //   })

  //   const result = await saveLot(mockLot)

  //   expect(result.lotId).toBe(expectedLotId)
  //   expect(result.lotName).toBe(`TestLot_${expectedLotId}`)
  //   expect(mockCollection.countDocuments).toHaveBeenCalled()
  // })

  // Handles mongoose connection errors or database unavailability
  it('should throw error when database connection fails', async () => {
    const mockLot: ILot = {
      _id: '507f1f77bcf86cd799439011',
      productId: 'prod123',
      lotName: 'test-lot',
      type: 'faq',
      coCode: [1, 2],
      ccCode: [3, 4],
      unionCode: 5,
      quantity: 100,
      lotStatus: 'pending',
      modalFieldCombined: [],
      lotId: 'L123',
      batchIds: [],
      farmerProduceIds: [],
      flag: false,
      flagReason: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      isDeleted: false,
      note: null,
      id: 1,
      isReadyForContainer: false,
      isSubLotCreated: false
    }

    const mockCollection = {
      countDocuments: jest
        .fn()
        .mockRejectedValue(new Error('DB Connection Failed'))
    }

    const mockConnection = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }

    jest
      .spyOn(mongoose, 'connection', 'get')
      .mockReturnValue(mockConnection as any)

    await expect(saveLot(mockLot)).rejects.toThrow(
      'Error while saving lot. Error: DB Connection Failed'
    )
    expect(mockCollection.countDocuments).toHaveBeenCalled()
  })
})
