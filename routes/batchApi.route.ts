const router = require("express").Router();
import { Batches } from "../models";
import { getBatch, getModalFields, updateBatchColumnFields } from "../services";

import {
  saveBatch,
  getFarmerProduceDetailsById,
  updateBatchIdInFarmerProduceDetails,
  saveActivity,
  authorization,
} from "../services";

// get request to get all lots by coCode
// router.get("/all/cc", authorization("UNION"), async (req, res, next) => { //TODO: uncomment me
router.get("/all/cc", async (req, res, next) => {
  //TODO: check if union permission is required
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

// router.post("/new", authorization("UNION"), async (req, res, next) => {
router.post("/new", async (req, res, next) => {
  try {
    const { productId } = req.params; //TODO: not working
    // const { id: userId } = req.locals; //TODO: uncomment me

    const userId = 1; //TODO: remove me

    // const { farmerIds, ...batchData } = req.body; //TODO: uncomment me
    const { farmerProduceIds, ...batchData } = req.body;

    // const farmerProduceIds = ["64855a9b0133ce994c786e3c", "64855a9b0133ce994c786e3f"]; //TODO: remove me

    if (!farmerProduceIds || farmerProduceIds.length === 0) {
      throw new Error("Should contain farmer ids");
    }

    const modalFieldsArr = await getModalFields(
      "645774053e1875e3bd793978",
      "BATCH"
    ); //TODO: replace it with dynamic product id

    // TODO: check if want to add more fields like ccCodes, type, note,
    const batch = {
      ...batchData,
      product: productId,
      deleted: false,
      isReadyForLot: false,
      batchStatus: "ADD",
      modalFieldCombined: modalFieldsArr.modalFieldCombined,
      farmerProduceIds,
    };

    const savedBatch = await saveBatch(batch); // Saving the batch

    console.log("savedBatch", savedBatch);

    const { createdOn, batchId, _id: batchIdMongo }: any = savedBatch;

    for (const farmerProduceId of farmerProduceIds) {
      // Update the batchId in farmer collection
      const farmerProduce = await getFarmerProduceDetailsById(farmerProduceId);
      if (!farmerProduce) {
        throw new Error("Invalid farmer id found");
      }
      await updateBatchIdInFarmerProduceDetails(
        farmerProduceId,
        batchId,
        batchIdMongo.toString()
      );
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
      farmerProduceIds,
    };

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// router.put("/:batchId", authorization("UNION"), async (req, res, next) => { //TODO: add authorization back
router.put("/:batchId", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    console.log("batchId", batchId);
    // const { id: userId } = req.locals;
    const batchData = req.body;

    console.log("batchData", batchData);

    const batch = await getBatch(batchId);
    // const batch = await getBatch("647d6c12e4d1b6c73dff8827");
    if (!batch) {
      throw new Error("Invalid batch id found");
    }

    if (batchData.fields["finalizeBatch"]) {
      batch.batchStatus = "DONE";
      batch.isReadyForLot = true;
    } else if (!batchData.fields["finalizeBatch"]) {
      batch.batchStatus = "EDIT";
      batch.isReadyForLot = false;
    }

    const findModalFieldIndex = batch.modalFieldCombined.findIndex((obj) => {
      console.log("obj.modalFieldId", obj.modalFieldId.toString());
      console.log(
        "batchData.modalFieldId",
        batchData.selectedModalFieldId.toString()
      );
      console.log(obj.modalFieldId == batchData.selectedModalFieldId);
      return obj.modalFieldId == batchData.selectedModalFieldId;
    });

    if (findModalFieldIndex === -1) {
      throw new Error("Invalid modal field id found");
    }

    const batchModalFieldsArr = batch.modalFieldCombined.map((obj, index) => {
      if (index === findModalFieldIndex) {
        // Iterate over each field in obj.fields
        obj.fields.forEach((field) => {
          // Check if the field's name is present as a key in batchData.fields
          if (batchData.fields.hasOwnProperty(field?.name)) {
            // Update the value key with the corresponding value from batchData.fields
            field.value = batchData.fields[field.name];
          }
        });

        // Return the updated obj
        return obj;
      }
      return obj;
    });

    console.log("batchModalFields", batchModalFieldsArr);

    batch.modalFieldCombined = batchModalFieldsArr;

    const updatedBatch = await updateBatchColumnFields(batch);

    console.log("updatedBatch", updatedBatch);

    const timestamp = new Date().toISOString();

    const activity = {
      batchId,
      // userId,//TODO: uncomment me
      userId: 1,
      timestamp,
      type: "BATCH_UPDATE",
      name: updatedBatch.batchName,
      activityFor: "BATCH",
    };

    console.log("activity", activity);

    await saveActivity(activity); //FIXME: uncomment this line

    res.status(200).json(updatedBatch);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
