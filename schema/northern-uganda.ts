export const NORTHERN_UGANDA_SCHEMA = {
  personal_details: {
    farmer_name: true,
    gender: true,
    date_of_birth: true,
    format_date: true,
    contact_number: true,
    national_identity_number: true,
    level_of_education: true,
    no_of_dependents: true,
    confirm_no_of_dependents: true // need to add check for this
  },
  administrative_details: {
    name_of_village: true,
    name_of_collection_centre: true // need to add check for this
  },
  farm_details: {
    land_acreage: true,
    confirm_land_acreage: true, // need to add check for this
    coffee_acrage: true,
    no_of_coffee_trees: true,
    confirm_no_of_coffee_trees: true, // need to add check for this
    year_of_first_planting: true, // need to add to DB
    other_farm_enterprises: true,
    agroforestry: true
  },
  farm_boundary: {
    no_of_farm_plots: true, // need to add to db
    photo_of_farm: true,
    'farm_plot@odata.navigationLink': true
    // 'farm_plot@odata.navigationLink':
    //   "Submissions('uuid%3Aa31d1f29-fd32-4e1d-9dbf-2dadb791850e')/farm_boundary/farm_plot" // confirm
  },
  Identity: {
    consent: true,
    comment: true, // need to add to db
    enumerator: true // confirm if enumerator and submitterName are same
  },
  date_of_survey: true, // need to add to db
  submissionUUID: true,
  meta: {
    instanceID: true,
    instanceName: true,
    entity: true
  },
  __system: {
    submissionDate: true,
    submitterName: true,
    reviewState: true,
    edits: true,
    formVersion: true
  }
}

export const NORTHERN_UGANDA_KEYMAP = {
  farmer_name: 'farmerName',
  gender: 'gender',
  date_of_birth: 'dateOfBirth',
  format_date: 'formatDate',
  contact_number: 'contactNumber',
  national_identity_number: 'nationalIdentityNumber',
  level_of_education: 'levelOfEducation',
  no_of_dependents: 'noOfDependents',
  confirm_no_of_dependents: 'confirmNoOfDependents',
  name_of_village: 'village',
  name_of_collection_centre: 'cc',
  land_acreage: 'landAcreage',
  confirm_land_acreage: 'confirmLandAcreage',
  coffee_acrage: 'coffeeAcreage',
  no_of_coffee_trees: 'noOfCoffeeTrees',
  confirm_no_of_coffee_trees: 'confirmNoOfCoffeeTrees',
  year_of_first_planting: 'yearOfFirstPlanting', // yet to be added
  other_farm_enterprises: 'otherFarmEnterprises',
  agroforestry: 'agroforestry',
  no_of_farm_plots: 'noOfFarmPlots', // yet to be added
  photo_of_farm: 'photoOfFarm',
  'farm_plot@odata.navigationLink': 'farmLocation',
  instanceID: 'instanceID',
  instanceName: 'instanceName',
  entity: 'entity',
  submissionDate: 'submittedOnODK',
  submitterName: 'submitterName',
  formVersion: 'formVersion',
  reviewState: 'reviewState',
  edits: 'edits'
}

export const extraFields = ({
  noOfDependents,
  confirmNoOfDependents,
  landAcreage,
  confirmLandAcreage,
  noOfCoffeeTrees,
  confirmNoOfCoffeeTrees
}) => {
  noOfDependents =
    confirmNoOfDependents === null ? noOfDependents : confirmNoOfDependents
  landAcreage = confirmLandAcreage === null ? landAcreage : confirmLandAcreage
  noOfCoffeeTrees =
    confirmNoOfCoffeeTrees === null ? noOfCoffeeTrees : confirmNoOfCoffeeTrees
}
