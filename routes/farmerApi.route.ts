const router = require("express").Router();

import { postFarmersDetail } from "../services/farmerService";

router.post("/new", async (req, res, next) => {
  try {
    const { productId } = req.params; //TODO: not working

    const { ...farmerData } = req.body;
    const farmer = {
      product: productId,
      ...farmerData,
    };

    const savedFarmer = await postFarmersDetail(farmer); // Saving the farmer
    res.status(200).json(savedFarmer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
