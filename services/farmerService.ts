import { Farmers } from "../models";

const getFarmerDetailsById = async (farmerId: string) => {
  try {
    const farmer = await Farmers.findById(farmerId);
    return farmer;
  } catch (err) {
    throw new Error("Error while fetching farmer details");
  }
};

const getFarmersDetailAfterTimestamp = async (timestamp: Date) => {
  const farmers = await Farmers.find({
    collectionDate: { $gte: timestamp },
  });
  return farmers;
};

const postFarmersDetail = async (farmerInfo: any) => {
  const newFarmer = new Farmers({
    ...farmerInfo,
    product: "5f9b3b3b9d3b9a1b1c9d3b9a", //TODO: remove hardcoding
    collectionDate: new Date(),
  });
  await newFarmer.save();
  return newFarmer;
};

const updateBatchIdInFarmerDetails = async (
  farmerId: string,
  batchId: string
) => {
  try {
    //code to update document in mongodb
    const updatedFarmer = await Farmers.findByIdAndUpdate(
      farmerId,
      {
        batchId: batchId,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedFarmer) {
      throw new Error("Document not found");
    }
    return updatedFarmer;
  } catch (err) {
    throw new Error("Error while updating farmer details");
  }
};

export {
  getFarmerDetailsById,
  getFarmersDetailAfterTimestamp,
  postFarmersDetail,
  updateBatchIdInFarmerDetails,
};
