import { useEffect } from "react";
import { saveLotInBulk } from "./api"; // Assumed API function to save lot in bulk

/**
 * Retrieves a list of LotList objects based on the specified criteria.
 *
 * @param {object} request - The HttpServletRequest object.
 * @param {string} coCodes - The comma-separated list of coCodes.
 * @param {number} limit - The maximum number of results to return.
 * @param {number} offset - The number of results to skip before returning the desired range.
 * @returns {Array} An array of LotList objects.
 */
async function getLotList(request, coCodes, limit, offset) {
  const values = coCodes.split(",");
  const longValues = values.map((value) => Number(value));
  const cooperatives = {};

  for (let i = 0; i < values.length; i++) {
    const coCode = longValues[i];
    let cooperative = null;

    try {
      // Assumes an API function named 'cooperativeApi.findByCode' for retrieving cooperative data
      cooperative = await cooperativeApi.findByCode(coCode);
    } catch (e) {
      console.error(e.message);
    }

    cooperatives[coCode] = cooperative;
  }

  let lots = [];

  try {
    // Assumes an API function named 'dao.getByPropertyfromArray' for retrieving lots data
    lots = await dao.getByPropertyfromArray(
      "coCode",
      longValues,
      limit,
      offset,
      "createdOn desc"
    );
  } catch (e) {
    console.error(e.message);
  }

  const lotLists = [];

  for (const lot of lots) {
    let factoryReport = null;

    try {
      // Assumes an API function named 'factoryReportService.findByPropertyWithCondtion' for retrieving factory report data
      factoryReport = await factoryReportService.findByPropertyWithCondtion(
        "lotId",
        lot.id,
        "="
      );
    } catch (e) {
      // Don't do anything here.
    }

    const coCode = lot.coCode;
    const cooperative = cooperatives[coCode];
    const lotList = new LotList(lot, factoryReport, cooperative);
    lotLists.push(lotList);
  }

  return lotLists;
}

// Usage example

const request = {
  /* HttpServletRequest object */
};
const coCodes = "123,456,789";
const limit = 10;
const offset = 0;

getLotList(request, coCodes, limit, offset)
  .then((result) => {
    // Handle the result array containing LotList objects
    console.log(result);
  })
  .catch((error) => {
    // Handle any errors that occurred during the process
    console.error(error);
  });

/**
 * Saves lots in bulk based on the provided JSON string.
 *
 * @param {string} jsonString - The JSON string containing lot information.
 * @param {object} request - The HTTP request object.
 * @returns {Promise<object>} A Promise that resolves to the result object.
 * @throws {Error} If the JSON string is invalid or missing batch ids.
 */
async function saveInBulk(jsonString, request) {
  const result = {}; // Result object to store the lot and batches
  const { batchIds, ...lotData } = JSON.parse(jsonString); // Parsing the JSON string

  if (!batchIds || batchIds.length === 0) {
    throw new Error("Should contain batch ids");
  }

  const lot = {
    ...lotData,
    lotStatus: "AT_CO_OPERATIVE",
    deleted: false,
  };

  const savedLot = await saveLot(lot); // Saving the lot
  const { createdOn, id: lotId } = savedLot;

  // Update the lot name by appending the lot id
  const updatedLotName = `${lot.lotName}_${lotId}`;
  await updateLotName(lotId, updatedLotName);

  const userId = UserUtil.getUserDetails(request).id;

  const batches = [];

  // Add traceability for the lot creation
  for (const batchId of batchIds) {
    const lotCreation = {
      batchId,
      lotId,
      userId,
      timestamp: createdOn,
      note: "",
      isDeleted: false,
    };

    // Update the batch activity
    const batch = await getBatch(batchId);
    if (!batch) {
      throw new Error("Invalid batch id found");
    }
    batches.push(batch);
    await updateBatchLotId(batchId, lotId);
    await saveLotCreation(lotCreation);
  }

  // Add activity of lot creation
  const timestamp = createdOn || new Date().toISOString();
  const activity = {
    className: lot.constructor.name,
    lotId,
    userId,
    timestamp,
    type: "LOT_CREATION",
    name: lot.lotName,
  };
  await saveActivity(activity);

  result.lot = savedLot;
  result.batches = batches;

  return result;
}

// Helper functions (assumed) used in the code

/**
 * Saves a lot.
 *
 * @param {object} lot - The lot object to be saved.
 * @returns {Promise<object>} A Promise that resolves to the saved lot.
 */
async function saveLot(lot) {
  // Implement the save logic using an API call
  const savedLot = await saveLotInBulk(lot);
  return savedLot;
}

/**
 * Updates the lot name.
 *
 * @param {number} lotId - The ID of the lot to be updated.
 * @param {string} lotName - The updated lot name.
 * @returns {Promise} A Promise that resolves when the update is complete.
 */
async function updateLotName(lotId, lotName) {
  // Implement the update logic using an API call
  // Assumes an API function named 'updateLotName'
  await updateLotName(lotId, lotName);
}

/**
 * Retrieves a batch by ID.
 *
 * @param {number} batchId - The ID of the batch to retrieve.
 * @returns {Promise<object|null>} A Promise that resolves to the batch object if found, or null if not found.
 */
async function getBatch(batchId) {
  // Implement the retrieval logic using an API call
  // Assumes an API function named 'getBatchById'
  const batch = await getBatchById(batchId);
  return batch;
}

/**
 * Updates the lot ID of a batch.
 *
 * @param {number} batchId - The ID of the batch to update.
 * @param {number} lotId - The updated lot ID.
 * @returns {Promise} A Promise that resolves when the update is complete.
 */
async function updateBatchLotId(batchId, lotId) {
  // Implement the update logic using an API call
  // Assumes an API function named 'updateBatchLotId'
  await updateBatchLotId(batchId, lotId);
}

/**
 * Saves a lot creation.
 *
 * @param {object} lotCreation - The lot creation object to be saved.
 * @returns {Promise} A Promise that resolves when the save is complete.
 */
async function saveLotCreation(lotCreation) {
  // Implement the save logic using an API call
  // Assumes an API function named 'saveLotCreation'
  await saveLotCreation(lotCreation);
}

/**
 * Saves an activity.
 *
 * @param {object} activity - The activity object to be saved.
 * @returns {Promise} A Promise that resolves when the save is complete.
 */
async function saveActivity(activity) {
  // Implement the save logic using an API call
  // Assumes an API function named 'saveActivity'
  await saveActivity(activity);
}

// Usage example

const jsonString =
  '{"lotName": "Example Lot", "otherProperty": "Other Value", "batchIds": [1, 2, 3]}';
const request = {
  /* HTTP request object */
};

saveInBulk(jsonString, request)
  .then((result) => {
    // Handle the result object containing the saved lot and batches
    console.log(result);
  })
  .catch((error) => {
    // Handle any errors that occurred during the process
    console.error(error);
  });
