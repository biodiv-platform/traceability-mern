require('dotenv').config()

export const SITE_CONFIG = {
  ACTIVITY_API: `${process.env.ENTITIES_BASE_API}/activity-api/api/v1`,
  ODK_FARMER_MEMBER_API: `${process.env.ODK_FARMER_MEMBER_BASE_API}/odk-api/api/v1`,
  ENTITIES_API: `${process.env.ENTITIES_BASE_API}/entities-api/api/`,
  ROBUSTA_COFFEE_PRODUCT_ID: '645774053e1875e3bd793978'
}

export const ODK_REVIEW_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  HAS_ISSUES: 'hasIssues'
}

export const ODK_FORM_DETAILS = {
  'Buzaaya-Union-Farmer-Registraion': {
    FORM_ID: 2,
    FORM_NAME: 'Buzaaya-Union-Farmer-Registraion',
    FP_FORM_ID: 2,
    FP_FORM_NAME: 'Buzaaya-Farmer-Collection',
    LAST_SYNCED_TIME_KEY_FM: 'LastFetchedTimeForBuzaayaFarmerMember',
    LAST_SYNCED_TIME_KEY_FP: 'LastFetchedTimeForBuzaayaFarmerProduce',
    SCHEMA: 'BUZAAYA_SCHEMA',
    KEYMAP: 'BUZAAYA_KEYMAP',
    FORM_KEY: 'BUZAAYA',
    UNION_ID: 5
  },
  'NorthernUganda-Union-Farmer-Registraion': {
    FORM_ID: 4,
    FORM_NAME: 'NorthernUganda-Union-Farmer-Registraion',
    FP_FORM_ID: null,
    FP_FORM_NAME: null,
    LAST_SYNCED_TIME_KEY_FM: 'LastFetchedTimeForNorthernUgandaFarmerMember',
    LAST_SYNCED_TIME_KEY_FP: 'LastFetchedTimeForNorthernUgandaFarmerProduce',
    SCHEMA: 'NORTHERN_UGANDA_SCHEMA',
    KEYMAP: 'NORTHERN_UGANDA_KEYMAP',
    FORM_KEY: 'NORTHERN_UGANDA',
    UNION_ID: 6
  }
}

// export const ODK_FORM_DETAILS = {
//   BUZAAYA: {
//     FORM_ID: 2,
//     FORM_NAME: 'Buzaaya-Farmer-Collection',
//     LAST_SYNCED_TIME_KEY_FP: 'LastFetchedTimeForBuzaayaFarmerProduce'
//   }
// }

export const LOCATION_TYPE = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint'
}

export const AGROFORESTRY_TYPES = {
  YES: 'Yes',
  NO: 'No'
}

export const BATCH_FIELD_UPDATE_RULES = {}

export const LOT_FIELD_UPDATE_RULES = {
  'Grading Report': {
    input_FAQ_weight: (lotData) => lotData.quantity
  }
}

export const CONTAINER_FIELD_UPDATE_RULES = {
  'Sale Report': {
    total_kgs: (containerData) => containerData.quantity
  }
}
