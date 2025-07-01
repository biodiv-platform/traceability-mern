import {
  getDocumentAutocomplete,
  getCount,
  downloadData
} from '../controllers/globalController'

const router = require('express').Router()

router.get('/document/autocomplete', getDocumentAutocomplete)

router.get('/count', getCount)

router.post('/download/:level', downloadData)

module.exports = router
