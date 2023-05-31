import { ActivityLogger } from "../models";

const saveActivity = async (activity) => {
  try {
    const activityLogger = new ActivityLogger(activity);

    const savedActivity = await activityLogger.save();
    return savedActivity;
  } catch (err) {
    throw new Error("Error while saving activity");
  }
};

export { saveActivity };
