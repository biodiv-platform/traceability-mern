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
  FORM_ID: 2,
  FORM_NAME: 'Buzaaya-Union-Farmer-Registraion'
}

export const FARMER_PRODUCE_ODK_FORM_DETAILS = {
  FORM_ID: 2,
  FORM_NAME: 'Buzaaya-Farmer-Collection'
}
