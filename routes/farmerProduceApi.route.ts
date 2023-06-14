const router = require("express").Router();

import { FarmerProduce } from "../models";
import { postFarmerProduceDetail, updateFarmerCollection } from "../services";

// router.get("/all/cc", authorization("UNION"), async (req, res, next) => { //TODO: uncomment me
router.get("/all", async (req, res, next) => {
  //TODO: check if union permission is required
  try {
    const { ccCodes, limit, offset } = req.query;
    // TODO: handle pagination
    const BatchArr = await FarmerProduce.find();
    res.status(200).json(BatchArr);
  } catch (err) {
    next(err);
  }
});

router.post("/new", async (req, res, next) => {
  try {
    const { productId } = req.params; //TODO: not working

    const { ...farmerData } = req.body;
    const farmer = {
      product: productId,
      ...farmerData,
    };

    console.log("farmer", farmer);

    const savedFarmer = await postFarmerProduceDetail(farmer);

    console.log("savedFarmer", savedFarmer);

    const updatedFarmerCollection = await updateFarmerCollection(
      farmer.farmerId,
      savedFarmer._id
    );

    console.log("updatedFarmerCollection", updatedFarmerCollection);

    // Saving the farmer
    res.status(200).json(savedFarmer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
