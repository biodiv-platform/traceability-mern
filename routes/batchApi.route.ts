const router = require("express").Router();
import { Batches } from "../models";
import { getModalFields } from "../services/modalFieldService";

import {
  saveBatch,
  getFarmerDetailsById,
  updateBatchIdInFarmerDetails,
  saveActivity,
  authorization,
} from "../services";

// get request to get all lots by coCode
router.get("/all/cc", async (req, res, next) => {
  try {
    const { ccCodes, limit, offset } = req.query;
    // TODO: handle pagination
    const BatchArr = await Batches.find({
      ccCode: { $in: ccCodes.split(",").map(Number) },
    });
    res.status(200).json(BatchArr);
  } catch (err) {
    next(err);
  }
});

// post new batch

router.post("/new", authorization("UNION"), async (req, res, next) => {
  try {
    const { productId } = req.params; //TODO: not working
    const { id: userId } = req.locals;

    const { farmerIds, ...batchData } = req.body;

    if (!farmerIds || farmerIds.length === 0) {
      throw new Error("Should contain farmer ids");
    }

    const modalFieldsArr = await getModalFields(
      "645774053e1875e3bd793978",
      "BATCH"
    ); //TODO: replace it with dynamic product id

    // TODO: check if want to add more fields like ccCodes, type, note,
    const batch = {
      ...batchData,
      productId: productId,
      deleted: false,
      isReadyForLot: false,
      batchStatus: "ADD",
      modalFieldCombined: modalFieldsArr.modalFieldCombined,
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
      activityFor: "BATCH",
    };

    await saveActivity(activity); //FIXME: uncomment this line

    const result = {
      batch: savedBatch,
      farmerIds,
    };

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
