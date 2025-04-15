import {
  retrieveFarmerMembersLastFetchedTime,
  saveLastFetchedFarmerMember,
  saveLastFetchedFarmerProduce,
  updateFarmerMembersLastFetchedTime
} from '../../services'
import { Product } from '../../models'

describe('Product API Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear mocks before each test
  })

  // Successfully retrieve last fetched time for valid form name and existing product
  it('should return last fetched time when product exists for given form name', async () => {
    const mockProduct = {
      productName: 'Robusta Coffee',
      LastFetchedTimeForBuzaayaFarmerMember: '2023-01-01',
      toObject: () => ({
        productName: 'Robusta Coffee',
        LastFetchedTimeForBuzaayaFarmerMember: '2023-01-01'
      })
    }

    jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct)

    const result = await retrieveFarmerMembersLastFetchedTime(
      'Buzaaya-Union-Farmer-Registraion'
    )

    expect(result).toBe('2023-01-01')
    expect(Product.findOne).toHaveBeenCalledWith({
      productName: 'Robusta Coffee'
    })
  })

  // Handle case when product is not found in database
  it('should return null when product is not found', async () => {
    jest.spyOn(Product, 'findOne').mockResolvedValue(null)

    const result = await retrieveFarmerMembersLastFetchedTime(
      'Buzaaya-Union-Farmer-Registraion'
    )

    expect(result).toBeNull()
    expect(Product.findOne).toHaveBeenCalledWith({
      productName: 'Robusta Coffee'
    })
  })

  // Successfully update last fetched time for valid form name and time value
  it('should update product with new last fetched time when valid form name is provided', async () => {
    const mockProduct = {
      productName: 'Robusta Coffee',
      LastFetchedTimeForBuzaayaFarmerMember: '2023-01-01'
    }

    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(mockProduct)

    const result = await updateFarmerMembersLastFetchedTime(
      '2023-01-01',
      'Buzaaya-Union-Farmer-Registraion'
    )

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productName: 'Robusta Coffee' },
      { LastFetchedTimeForBuzaayaFarmerMember: '2023-01-01' },
      { new: true }
    )
    expect(result).toEqual(mockProduct)
  })

  // Handle invalid/non-existent form name in ODK_FORM_DETAILS
  it('should throw error when invalid form name is provided', async () => {
    const invalidFormName = 'Invalid-Form-Name'

    await expect(
      updateFarmerMembersLastFetchedTime('2023-01-01', invalidFormName)
    ).rejects.toThrow()

    expect(Product.findOneAndUpdate).not.toHaveBeenCalled()
  })

  // Successfully update product with valid FarmerId for Robusta Coffee
  it('should update LastFetchedFarmerMember when valid FarmerId is provided', async () => {
    const mockFarmerId = 'farmer123'
    const mockProduct = {
      productName: 'Robusta Coffee',
      LastFetchedFarmerMember: mockFarmerId
    }

    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(mockProduct)

    const result = await saveLastFetchedFarmerMember(mockFarmerId)

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productName: 'Robusta Coffee' },
      { LastFetchedFarmerMember: mockFarmerId },
      { new: true }
    )
    expect(result).toEqual(mockProduct)
  })

  // Handle case when no product with productName 'Robusta Coffee' exists
  it('should return null when product does not exist', async () => {
    const mockFarmerId = 'farmer123'

    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(null)

    const result = await saveLastFetchedFarmerMember(mockFarmerId)

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productName: 'Robusta Coffee' },
      { LastFetchedFarmerMember: mockFarmerId },
      { new: true }
    )
    expect(result).toBeNull()
  })

  // Successfully update product with new LastFetchedFarmerProduce ID
  it('should update LastFetchedFarmerProduce ID when product exists', async () => {
    const mockProduct = {
      productName: 'Robusta Coffee',
      LastFetchedFarmerProduce: 'old-id'
    }
    const mockUpdatedProduct = {
      ...mockProduct,
      LastFetchedFarmerProduce: 'new-id'
    }

    jest
      .spyOn(Product, 'findOneAndUpdate')
      .mockResolvedValue(mockUpdatedProduct)

    const result = await saveLastFetchedFarmerProduce('new-id')

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productName: 'Robusta Coffee' },
      { LastFetchedFarmerProduce: 'new-id' },
      { new: true }
    )
    expect(result).toEqual(mockUpdatedProduct)
  })

  // Handle case when no product with productName 'Robusta Coffee' exists
  it('should return null when product does not exist', async () => {
    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(null)

    const result = await saveLastFetchedFarmerProduce('new-id')

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productName: 'Robusta Coffee' },
      { LastFetchedFarmerProduce: 'new-id' },
      { new: true }
    )
    expect(result).toBeNull()
  })
})
