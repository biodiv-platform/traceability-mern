import { Batches } from "../models";

const getBatch = async (batchId: string) => {
  try {
    const batch = await Batches.findById(batchId);
    return batch;
  } catch (err) {
    throw new Error("Error while fetching batch");
  }
};

const saveBatch = async (batch: any) => {
  try {
    console.log("batch", batch);
    const newBatch = new Batches(batch);
    const savedBatch = await newBatch.save();
    return savedBatch;
  } catch (err) {
    throw new Error("Error while saving batch");
  }
};

const updateBatchLotId = async (batchId: string, lotId: string) => {
  try {
    //code to update document in mongodb

    const updatedBatch = await Batches.findByIdAndUpdate(
      batchId,
      {
        lotId: "123test",
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

export { getBatch, saveBatch, updateBatchLotId };
