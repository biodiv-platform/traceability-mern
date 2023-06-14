import { Lots } from "../models";
const mongoose = require("mongoose");

interface ILot {
  _id: string;
  productId: string;
  lotName: string;
  type: string;
  coCode: number;
  quantity: number;
  createdOn: Date;
  lotStatus: string;
  deleted: boolean;
  modalFieldCombined: [
    {
      columnName: string;
      isOptional: boolean;
      fields: [];
    }
  ];
}

const getLot = async (lotId: string) => {
  try {
    const lot = await Lots.findById(lotId).exec();
    return lot;
  } catch (err) {
    throw new Error("Error while fetching lot");
  }
};

const saveLot = async (lot: ILot) => {
  try {
    const db = mongoose.connection;

    const count = await db.collection("lotinfos").countDocuments();
    const lotId = (count + 1).toString().padStart(3, "0");

    const timestamp = new Date();

    console.log("lot from savelot func: ", lot);

    const result = await new Lots({
      product: "645774053e1875e3bd793978", //TODO: make this dynamic product id
      lotId: lotId,
      createdOn: lot.createdOn || timestamp,
      ...lot,
    }).save();

    // update lotname with lotID
    const renamedLot = `${result.lotName}_${result.lotId}`;

    const updatedLotName = await Lots.findByIdAndUpdate(
      result._id,
      {
        lotName: renamedLot,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();

    return updatedLotName;
  } catch (err) {
    console.log("err", err);
    throw new Error(err.message);
  }
};

const updateLotColumnFields = async (lot: ILot) => {
  try {
    //code to update document in mongodb

    console.log("lot in service", lot);

    const updatedBatch = await Lots.findByIdAndUpdate(
      lot._id,
      {
        lotStatus: lot.lotStatus,
        // isReadyForLot: lot.isReadyForLot,
        modalFieldCombined: lot.modalFieldCombined,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedBatch) {
      throw new Error("Document not found");
    }

    console.log("updatedBatch from service func: ", updatedBatch);

    return updatedBatch;
  } catch (err) {
    throw new Error("Error while updating lot column fields");
  }
};

const updateFarmerProduceIdsInLot = async (
  lotId: string,
  farmerProduceIds: string[]
) => {
  try {
    //code to update document in mongodb

    const updatedLot = await Lots.findByIdAndUpdate(
      lotId,
      {
        farmerProduceIds: farmerProduceIds,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLot) {
      throw new Error("Document not found");
    }
    return updatedLot;
  } catch (err) {
    throw new Error("Error while updating lot. Error: " + err.message);
  }
};

const deleteAllLots = async () => {
  try {
    const deletedLots = await Lots.deleteMany({});
    console.log("deleted All Lots");
    return deletedLots;
  } catch (err) {
    throw new Error("Error while deleting lots");
  }
};

// deleteAllLots(); //TODO: remove this and function call above

export { getLot, saveLot, updateFarmerProduceIdsInLot, updateLotColumnFields };
