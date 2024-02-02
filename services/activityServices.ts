import { ActivityLogger } from '../models'

const saveActivity = async (activity): Promise<any> => {
  try {
    const activityLogger = new ActivityLogger(activity)

    const savedActivity = await activityLogger.save()
    return savedActivity
  } catch (err) {
    throw new Error(`Error while saving activity. Error:  ${err.message}`)
  }
}

export { saveActivity }
