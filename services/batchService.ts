import { Batches } from "../models";
const mongoose = require("mongoose");

interface IBatch {
  _id: string;
  batchName: string;
  batchStatus: string;
  ccCode: number[];
  isReadyForLot: boolean;
  modalFieldCombined: [
    {
      columnName: string;
      isOptional: boolean;
      fields: any;
    }
  ];
}

const getBatch = async (batchId: string) => {
  try {
    const batch = await Batches.findById(batchId);
    return batch;
  } catch (err) {
    throw new Error("Error while fetching batch");
  }
};

const getBatchesByBatchIds = async (BatchIds: []) => {
  try {
    const batches = await Batches.find({
      _id: { $in: BatchIds },
    });
    return batches;
  } catch (err) {
    throw new Error("Error while fetching batch");
  }
};

const saveBatch = async (batch: any) => {
  try {
    const db = mongoose.connection;
    const count = await db.collection("batchinfos").countDocuments();
    const batchId = (count + 1).toString().padStart(3, "0");

    const newBatch = new Batches({
      ...batch,
      product: "645774053e1875e3bd793978", //TODO: remove hardcoding
      createdOn: new Date(), //TODO:should we keep dateTime which is coming from frontend?
      lastUpdatedOn: new Date(),
      batchId: batchId,
    });

    const savedBatch = await newBatch.save();
    return savedBatch;
  } catch (err) {
    throw new Error(`Error while saving batch. Error:  ${err.message}`);
  }
};

const updateBatchLotId = async (
  batchId: string,
  lotId: string,
  lotStatus: string
) => {
  try {
    //code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(
      batchId,
      {
        lotId: lotId,
        lotStatus: lotStatus,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedBatch) {
      throw new Error("Document not found");
    }
    return updatedBatch;
  } catch (err) {
    throw new Error("Error while updating batch");
  }
};

const updateBatchColumnFields = async (Batch: IBatch) => {
  try {
    //code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(
      Batch._id,
      {
        batchStatus: Batch.batchStatus,
        isReadyForLot: Batch.isReadyForLot,
        modalFieldCombined: Batch.modalFieldCombined,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedBatch) {
      throw new Error("Document not found");
    }

    return updatedBatch;
  } catch (err) {
    throw new Error("Error while updating batch");
  }
};

const deleteAllBatches = async () => {
  try {
    const deletedBatches = await Batches.deleteMany({});
    return deletedBatches;
  } catch (err) {
    throw new Error("Error while deleting batches");
  }
};

// deleteAllBatches(); //TODO: remove this and the function above

export {
  getBatch,
  getBatchesByBatchIds,
  saveBatch,
  updateBatchLotId,
  updateBatchColumnFields,
  deleteAllBatches,
};
