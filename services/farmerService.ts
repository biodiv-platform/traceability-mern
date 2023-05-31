import { Farmers } from "../models";

const getFarmersDetailAfterTimestamp = async (timestamp: Date) => {
  const farmers = await Farmers.find({
    collectionDate: { $gte: timestamp },
  });
  return farmers;
};

const postFarmersDetail = async (farmerInfo: any) => {
  const newFarmer = new Farmers(farmerInfo);
  await newFarmer.save();
  return newFarmer;
};

export { getFarmersDetailAfterTimestamp, postFarmersDetail };
