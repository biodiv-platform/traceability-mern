export const BUZAAYA_SCHEMA = {
  personal_details: {
    farmer_name: true,
    gender: true,
    date_of_birth: true,
    format_date: true,
    contact_number: true,
    national_identity_number: true,
    level_of_education: true,
    no_of_dependents: true
  },
  administrative_details: {
    name_of_village: true,
    name_of_collection_centre: true
  },
  farm_details: {
    land_acreage: true,
    coffee_acrage: true,
    no_of_coffee_trees: true,
    other_farm_enterprises: true,
    agroforestry: true,
    location: true,
    photo_of_farm: true
  },
  meta: { instanceID: true, instanceName: true, entity: true },
  __system: {
    submissionDate: true,
    submitterName: true,
    formVersion: true,
    reviewState: true,
    edits: true
  }
}

export const BUZAAYA_KEYMAP = {
  farmer_name: 'farmerName',
  gender: 'gender',
  date_of_birth: 'dateOfBirth',
  format_date: 'formatDate',
  contact_number: 'contactNumber',
  national_identity_number: 'nationalIdentityNumber',
  level_of_education: 'levelOfEducation',
  no_of_dependents: 'noOfDependents',
  name_of_village: 'village',
  name_of_collection_centre: 'cc',
  land_acreage: 'landAcreage',
  coffee_acrage: 'coffeeAcreage',
  no_of_coffee_trees: 'noOfCoffeeTrees',
  other_farm_enterprises: 'otherFarmEnterprises',
  agroforestry: 'agroforestry',
  location: 'farmLocation',
  photo_of_farm: 'photoOfFarm',
  instanceID: 'instanceID',
  instanceName: 'instanceName',
  entity: 'entity',
  submissionDate: 'submittedOnODK',
  submitterName: 'submitterName',
  formVersion: 'formVersion',
  reviewState: 'reviewState',
  edits: 'edits'
}
