const router = require("express").Router();
const Lots = require("../models/LotInfo.model");

import { saveLot } from "../services/lotService";

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
router.post("/new", async (req, res, next) => {
  try {
    console.log(req.body);

    const { productId } = req.params;

    const { batchIds, ...lotData } = req.body;

    if (!batchIds || batchIds.length === 0) {
      throw new Error("Should contain batch ids");
    }

    const lot = {
      ...lotData,
      productId: productId,
      lotStatus: "AT_CO_OPERATIVE",
      deleted: false,
    };

    // TODO: add a code to generate lotID

    const savedLot = await saveLot(lot); // Saving the lot
    const { createdOn }: any = savedLot;

    console.log(savedLot);

    // Update the lot name by appending the lot id
    // const updatedLotName = `${lot.lotName}_${lotId}`;

    // TODO: update the lot name
    // await updateLotName(lotId, updatedLotName);

    // TODO: add put request to lotID's to batches

    // for (const batchId of batchIds) {
    //   const lotCreation = {
    //     batchId,
    //     lotId,
    //     userId,
    //     timestamp: createdOn,
    //     note: "",
    //     isDeleted: false,
    //   };

    //   // Update the batch activity
    //   const batch = await getBatch(batchId);
    //   if (!batch) {
    //     throw new Error("Invalid batch id found");
    //   }
    //   batches.push(batch);
    //   await updateBatchLotId(batchId, lotId);
    //   await saveLotCreation(lotCreation);
    // }

    res.status(201).json({ msg: "success" });
    //TODO: add logging to lot creation (see from lot service file)

    // const createdLotInfo = await lotInfo.save();

    // TODO:  edit result object
    // const result = {
    //   lotInfo: createdLotInfo,
    //   batchIds: batchIds,
    // };
    // res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
