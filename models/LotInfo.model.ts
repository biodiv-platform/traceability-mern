import { customAlphabet } from "nanoid";
const mongoose = require("mongoose");
const alphabet = "0123456789";
const nanoid = customAlphabet(alphabet, 3);

const Schema = mongoose.Schema;

const lotInfoSchema = new Schema({
  lotId: {
    type: Number,
    required: true,
    default: () => nanoid(),
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  lotName: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    required: true,
  },
  coCode: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  createdOn: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false,
  },
  lotStatus: {
    type: String,
    required: true,
  },
  modalFieldCombined: {
    type: Array,
    required: true,
  },
});

const LotInfo = mongoose.model("LotInfo", lotInfoSchema);

module.exports = LotInfo;
export {};
