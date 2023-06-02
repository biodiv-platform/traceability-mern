const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const modalFieldSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  fieldsOf: {
    type: String,
    required: true,
  },
  columnName: {
    type: "String",
    ref: "LotInfo",
    required: true,
  },
  fields: {
    type: Array,
    required: true,
  },
  isSaved: {
    type: Boolean,
    default: false,
    required: true,
  },
  isOptional: {
    type: Boolean,
    default: false,
    required: true,
  },
});

const ModalField = mongoose.model("ModalField", modalFieldSchema);

module.exports = ModalField;
export {};
