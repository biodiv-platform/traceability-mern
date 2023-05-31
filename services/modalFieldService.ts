const ModalField = require("../models/ModalField.model");

const getModalFields = async (productId: string) => {
  const modalFields = await ModalField.find({ product: productId });

  const result = modalFields.reduce(
    (acc, obj) => {
      const { columnName, fields } = obj;
      acc.modalFieldCombined.push({ columnName, fields });
      return acc;
    },
    { modalFieldCombined: [] }
  );

  return result;
};

export { getModalFields };
