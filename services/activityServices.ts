import { SITE_CONFIG } from '../static/constants'
import axios from 'axios'

const axPostActivity = async (req: any, payload: any): Promise<any> => {
  try {
    const config = {
      method: 'post',
      url: `${SITE_CONFIG.ACTIVITY_API}/service/log/cropcert`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization
      },
      data: payload
    }

    const res = await axios(config)
    return res
  } catch (error: any) {
    throw new Error(`Error posting activity. Error: ${error.message}`)
  }
}

export { axPostActivity }
