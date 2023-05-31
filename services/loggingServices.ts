const Activity = require("../models/ActivityLogger.model");

const saveActivity = async (activity) => {
  try {
    const activityLogger = new Activity(activity);

    const savedActivity = await activityLogger.save();
    return savedActivity;
  } catch (err) {
    throw new Error("Error while saving activity");
  }
};

export { saveActivity };
