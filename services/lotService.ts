const Lots = require("../models/LotInfo.model");

interface ILot {
  productId: string;
  lotName: string;
  type: string;
  coCode: number;
  quantity: number;
  lotStatus: string;
  deleted: boolean;
}

const saveLot = (lot: ILot) => {
  try {
    console.log("lot brofre pushing");
    console.log(lot);
    const result = new Lots({
      product: lot.productId,
      lotName: lot.lotName,
      type: lot.type,
      coCode: lot.coCode,
      quantity: lot.quantity,
      lotStatus: lot.lotStatus,
      deleted: lot.deleted,
      createdOn: Date.now(),
    });

    return result.save();
  } catch (err) {
    throw new Error("Error while saving lot");
  }
};

export { saveLot };
