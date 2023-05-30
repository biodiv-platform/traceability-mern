const Activity = require("../models/ActivityLogger.model");

const saveActivity = async (activity) => {
  try {
    console.log("activity");
    console.log(activity);
    const activityLogger = new Activity(activity);

    console.log("activityLogger");
    console.log(activityLogger);
    const savedActivity = await activityLogger.save();
    return savedActivity;
  } catch (err) {
    throw new Error("Error while saving activity");
  }
};

export { saveActivity };
