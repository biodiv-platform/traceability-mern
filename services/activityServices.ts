import { SITE_CONFIG } from '../static/constants'
import { ActivityLogger } from '../models'
import axios from 'axios'

const getActivitiesByHolderId = async (value): Promise<any> => {
  try {
    const activities = await ActivityLogger.find({
      activityHolderId: value
    }).sort({ dateCreated: -1 })
    return activities
  } catch (err) {
    throw new Error(`Error while fetching activities. Error:  ${err.message}`)
  }
}

const saveActivity = async (activity): Promise<any> => {
  try {
    const activityLogger = new ActivityLogger(activity)

    const savedActivity = await activityLogger.save()
    return savedActivity
  } catch (err) {
    throw new Error(`Error while saving activity. Error:  ${err.message}`)
  }
}

const axPostActivity = async (payload: any): Promise<any> => {
  try {
    const config = {
      method: 'post',
      url: `${SITE_CONFIG.ACTIVITY_API}/service/log/cropcert`, // Adjust the URL as needed
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data: payload // Include the payload in the request body
    }

    const res = await axios(config)
    return res
  } catch (error: any) {
    throw new Error(`Error posting activity. Error: ${error.message}`)
  }
}

export { getActivitiesByHolderId, saveActivity, axPostActivity }
