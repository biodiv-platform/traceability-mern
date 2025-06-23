import axios from 'axios'
import { axPostActivity } from '../../services'
import { SITE_CONFIG } from '../../static/constants'

jest.mock('axios')

interface ActivityResponse {
  data: {
    success: boolean
  }
}

describe('Activity API Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully post activity data when valid payload and auth provided', async () => {
    const mockReq = {
      headers: {
        authorization: 'Bearer token123'
      }
    }

    const mockPayload = {
      activityHolderId: 12,
      activityHolderType: 'BATCH',
      activityType: 'BATCH_CREATION',
      rootHolderId: 12,
      rootHolderType: 'content.eml.Batch',
      subRootHolderId: 12,
      subRootHolderType: 'content.eml.Batch',
      activityDescription: 'Batch:1 created',
      isShowable: true
    }

    const mockResponse: ActivityResponse = {
      data: { success: true }
    }

    const mockedAxios = axios as jest.MockedFunction<typeof axios>
    mockedAxios.mockResolvedValueOnce(mockResponse)

    const result = await axPostActivity(mockReq, mockPayload)

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'post',
      url: `${SITE_CONFIG.ACTIVITY_API}/service/log/cropcert`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: mockReq.headers.authorization
      },
      data: mockPayload
    })

    expect(result).toEqual(mockResponse)
  })
})
