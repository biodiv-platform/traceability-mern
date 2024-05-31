export const SITE_CONFIG = {
  ODK_FARMER_MEMBER_API: `${process.env.ODK_FARMER_MEMBER_BASE_API}/odk-api/api/v1`,
  ENTITIES_API: `${process.env.ENTITIES_BASE_API}/entities-api/api/`,
  ROBUSTA_COFFEE_PRODUCT_ID: '645774053e1875e3bd793978'
}

export const ODK_REVIEW_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  HAS_ISSUES: 'hasIssues'
}

export const FARMER_MEMBER_ODK_FORM_DETAILS = {
  BUZAAYA: {
    FORM_ID: 2,
    FORM_NAME: 'Buzaaya-Union-Farmer-Registraion',
    LAST_SYNCED_TIME_KEY_FM: 'LastFetchedTimeForBuzaayaFarmerMember',
    SCHEMA: 'BUZAAYA_SCHEMA',
    KEYMAP: 'BUZAAYA_KEYMAP',
    UNION_ID: 5
  },
  NORTHERN_UGANDA: {
    FORM_ID: 4,
    FORM_NAME: 'NorthernUganda-Union-Farmer-Registraion',
    LAST_SYNCED_TIME_KEY_FM: 'LastFetchedTimeForNorthernUgandaFarmerMember',
    LAST_SYNCED_TIME_KEY_FP: 'LastFetchedTimeForNorthernUgandaFarmerProduce',
    SCHEMA: 'NORTHERN_UGANDA_SCHEMA',
    KEYMAP: 'NORTHERN_UGANDA_KEYMAP',
    UNION_ID: 6
  }
}

export const FARMER_PRODUCE_ODK_FORM_DETAILS = {
  BUZAAYA: {
    FORM_ID: 2,
    FORM_NAME: 'Buzaaya-Farmer-Collection',
    LAST_SYNCED_TIME_KEY_FP: 'LastFetchedTimeForBuzaayaFarmerProduce'
  }
}

export const LOCATION_TYPE = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint'
}

export const AGROFORESTRY_TYPES = {
  YES: 'Yes',
  NO: 'No'
}
