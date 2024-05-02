import { ActivityLogger } from '../models'

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

export { getActivitiesByHolderId, saveActivity }
