import { FarmerProduce } from "../models";
const mongoose = require("mongoose");

const getFarmerProduceDetailsById = async (farmerId: string) => {
  try {
    const farmer = await FarmerProduce.findById(farmerId);
    return farmer;
  } catch (err) {
    throw new Error("Error while fetching farmer details");
  }
};

const getFarmerDetailsByFarmerId = async (farmerId: string) => {
  try {
    const farmer = await FarmerProduce.findById({
      farmerId: farmerId,
    });
    return farmer;
  } catch (err) {
    throw new Error("Error while fetching farmer details");
  }
};

const getFarmersDetailAfterTimestamp = async (timestamp: Date) => {
  const farmers = await FarmerProduce.find({
    collectionDate: { $gte: timestamp },
  });
  return farmers;
};

const postFarmerProduceDetail = async (farmerInfo: any) => {
  try {
    const db = mongoose.connection;

    const count = await db.collection("farmerproduceinfos").countDocuments();
    const farmerProduceId = (count + 1).toString().padStart(3, "0");
    const newFarmer = new FarmerProduce({
      ...farmerInfo,
      product: "645774053e1875e3bd793978", //TODO: remove hardcoding
      collectionDate: new Date(),
      farmerProduceId: farmerProduceId,
    });
    await newFarmer.save();
    return newFarmer;
  } catch (err) {
    throw new Error(
      `Error while saving farmer details. Error:  ${err.message}`
    );
  }
};

const updateBatchIdInFarmerProduceDetails = async (
  farmerProduceIdMongo: string,
  batchId: string,
  batchIdMongo: string
) => {
  try {
    //code to update document in mongodb
    const updatedFarmer = await FarmerProduce.findByIdAndUpdate(
      farmerProduceIdMongo,
      {
        batchId: batchId,
        batchIdMongo: batchIdMongo,
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

const deleteAllFarmers = async () => {
  try {
    const deletedFarmer = await FarmerProduce.deleteMany({});
    return deletedFarmer;
  } catch (err) {
    throw new Error("Error while deleting farmer details");
  }
};

// deleteAllFarmers();

export {
  getFarmerProduceDetailsById,
  postFarmerProduceDetail,
  updateBatchIdInFarmerProduceDetails,
};
