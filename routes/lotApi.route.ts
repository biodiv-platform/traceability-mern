const router = require("express").Router();
const Lots = require("../models/LotInfo.model");

import { saveLot } from "../services/lotService";
import { getBatch, updateBatchLotId } from "../services/batchService";
import { saveActivity } from "../services/loggingServices";
import { authorization } from "../services/authorizationService";
import { getModalFields } from "../services/modalFieldService";

// get request to get all lots by coCode
router.get("/all/coCodes", async (req, res, next) => {
  try {
    const { coCodes, limit, offset } = req.query;
    console.log(coCodes);
    console.log(typeof coCodes);
    const lotInfo = await Lots.find({
      coCode: coCodes.split(","),
      lotStatus: { $exists: true },
    });
    res.status(200).json(lotInfo);
  } catch (err) {
    next(err);
  }
});

//  post request to create a lot
router.post("/new", authorization("UNION"), async (req, res, next) => {
  try {
    console.log(req.body);

    const { productId } = req.params; //TODO: not working
    const { username } = req.locals;

    const { batchIds, ...lotData } = req.body;

    if (!batchIds || batchIds.length === 0) {
      throw new Error("Should contain batch ids");
    }

    const modalFieldsArr = await getModalFields("645774053e1875e3bd793978"); //TODO: replace it with dynamic product id

    const lot = {
      ...lotData,
      productId: productId,
      lotStatus: "AT_CO_OPERATIVE",
      deleted: false,
      modalFieldCombined: modalFieldsArr.modalFieldCombined,
    };

    const savedLot = await saveLot(lot); // Saving the lot
    const { createdOn, lotId }: any = savedLot;

    for (const batchId of batchIds) {
      // Update the batch activity
      const batch = await getBatch(batchId);
      if (!batch) {
        throw new Error("Invalid batch id found");
      }
      // batches.push(batch);
      await updateBatchLotId(batchId, lotId);
    }

    // Add activity of lot creation
    const timestamp = createdOn || new Date().toISOString();
    const activity = {
      lotId,
      username,
      timestamp,
      type: "LOT_CREATION",
      name: lot.lotName,
    };
    await saveActivity(activity);

    const result = {
      lotInfo: savedLot,
      batchIds: batchIds,
    };
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
