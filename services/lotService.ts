const Lots = require("../models/LotInfo.model");

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
      fields: [];
    }
  ];
}

const saveLot = (lot: ILot) => {
  try {
    const result = new Lots({
      product: "645774053e1875e3bd793978", //TODO: make this dynamic product id
      lotName: lot.lotName,
      type: lot.type,
      coCode: lot.coCode,
      quantity: lot.quantity,
      lotStatus: lot.lotStatus,
      deleted: lot.deleted,
      modalFieldCombined: lot.modalFieldCombined,
      createdOn: Date.now(),
    });

    // update lotname with lotID
    result.lotName = `${result.lotName}_${result.lotId}`;

    return result.save();
  } catch (err) {
    throw new Error("Error while saving lot");
  }
};

export { saveLot };
