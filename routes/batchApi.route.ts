const router = require("express").Router();
import { Batches } from "../models";

import {
  saveBatch,
  getFarmerDetailsById,
  updateBatchIdInFarmerDetails,
  saveActivity,
} from "../services";

// get request to get all lots by coCode
router.get("/all/cc", async (req, res, next) => {
  try {
    const { coCodes, limit, offset } = req.query;
    const BatchArr = await Batches.find({
      coCode: coCodes.split(","),
    });
    res.status(200).json(BatchArr);
  } catch (err) {
    next(err);
  }
});

// post new batch

router.post("/new", async (req, res, next) => {
  try {
    const { productId } = req.params; //TODO: not working
    const { id: userId } = req.locals;

    const { farmerIds, ...batchData } = req.body;

    if (!farmerIds || farmerIds.length === 0) {
      throw new Error("Should contain farmer ids");
    }

    //TODO: get modal fields for batch
    // const modalFieldsArr = await getModalFields("645774053e1875e3bd793978"); //TODO: replace it with dynamic product id

    const batch = {
      ...batchData,
      productId: productId,
      deleted: false,
      // modalFieldCombined: modalFieldsArr.modalFieldCombined,
    };

    const savedBatch = await saveBatch(batch); // Saving the batch

    const { createdOn, batchId }: any = savedBatch;

    for (const farmerId of farmerIds) {
      // Update the batchId in farmer collection
      const farmer = await getFarmerDetailsById(farmerId);
      if (!farmer) {
        throw new Error("Invalid farmer id found");
      }
      await updateBatchIdInFarmerDetails(farmerId, batchId);
    }

    const timestamp = createdOn || new Date().toISOString();

    const activity = {
      batchId,
      userId,
      timestamp,
      type: "BATCH_CREATION",
      name: savedBatch.batchName,
    };

    // await saveActivity(activity); //FIXME: uncomment this line

    res.status(201).json({ msg: "Batch created successfully" });
    // res.status(201).json(createdBatch);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
