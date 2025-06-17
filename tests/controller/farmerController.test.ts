import axios from 'axios'
import { SITE_CONFIG } from '../../static/constants'
import { axGetCodesFromODKData } from '../../services/farmerService'

jest.mock('axios')
const mockedAxios = jest.mocked(axios)

describe('farmerController', () => {
  describe('axGetCodesFromODKData', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should successfully fetch CC codes from ODK data', async () => {
      const mockResponse = {
        data: {
          code: 1001,
          cooperativeCode: 2001,
          unionCode: 3001
        }
      }

      ;(axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(
        mockResponse
      )

      const ccString = 'TestCC'
      const result = await axGetCodesFromODKData(ccString)

      expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: `${SITE_CONFIG.ENTITIES_API}cc/name/${ccString}`,
        headers: {
          accept: 'application/json'
        }
      })

      expect(result).toEqual({
        ccCode: 1001,
        coCode: 2001,
        unionCode: 3001
      })
    })

    it('should throw error when API call fails', async () => {
      const errorMessage = 'Network Error'
      ;(axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce(
        new Error(errorMessage)
      )

      const ccString = 'TestCC'

      await expect(axGetCodesFromODKData(ccString)).rejects.toThrow(
        `Error while getting cc codes from ODK data. Error: ${errorMessage}`
      )

      expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: `${SITE_CONFIG.ENTITIES_API}cc/name/${ccString}`,
        headers: {
          accept: 'application/json'
        }
      })
    })
  })
})
