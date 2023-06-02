const router = require("express").Router();

import { ModalField } from "../models";

router.get("/new", async (req, res, next) => {
  try {
    const { product, columnName, fields, isSaved, fieldsOf, isOptional } =
      req.body;

    const modalField = new ModalField({
      product,
      columnName,
      fields,
      isSaved,
      fieldsOf,
      isOptional,
    });

    const createdModalField = await modalField.save();
    res.status(201).json(createdModalField);
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  try {
    const modalFields = await ModalField.find();
    res.status(200).json(modalFields);
  } catch (err) {
    next(err);
  }
});

router.get("/:columnName", async (req, res, next) => {
  try {
    const { productId, columnName } = req.params;
    console.log(productId, columnName);
    const modalFields = await ModalField.find({
      product: productId,
      columnName: columnName,
    });
    res.status(200).json(modalFields);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
