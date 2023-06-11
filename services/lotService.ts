import { Lots } from "../models";
const mongoose = require("mongoose");

interface ILot {
  productId: string;
  lotName: string;
  type: string;
  coCode: number;
  quantity: number;
  lotStatus: string;
  deleted: boolean;
  modalFieldCombined: [
    {
      columnName: string;
      isOptional: boolean;
      fields: [];
    }
  ];
}

const saveLot = async (lot: ILot) => {
  try {
    const db = mongoose.connection;

    const count = await db.collection("lotinfos").countDocuments();
    const lotId = (count + 1).toString().padStart(3, "0");

    const result = await new Lots({
      product: "645774053e1875e3bd793978", //TODO: make this dynamic product id
      lotName: lot.lotName,
      type: lot.type,
      coCode: lot.coCode,
      quantity: lot.quantity,
      lotStatus: lot.lotStatus,
      deleted: lot.deleted,
      modalFieldCombined: lot.modalFieldCombined,
      lotId: lotId,
      createdOn: Date.now(),
    }).save();

    // update lotname with lotID
    const renamedLot = `${result.lotName}_${result._id.toString().slice(-3)}`;

    const updatedLotName = await Lots.findByIdAndUpdate(
      result._id,
      {
        lotName: renamedLot,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();

    return updatedLotName;
  } catch (err) {
    throw new Error("Error while saving lot");
  }
};

const deleteAllLots = async () => {
  try {
    const result = await Lots.deleteMany({});
    console.log("lots deleted: ", result);
  } catch (err) {
    throw new Error("Error while deleting lots");
  }
};
// deleteAllLots();

export { saveLot };
