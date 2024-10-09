import { mongooseConnection } from './configs/db'

const express = require('express')
const createError = require('http-errors')
const morgan = require('morgan')
const cors = require('cors')

require('dotenv').config()

const app = express()

// connect to mongodb
void mongooseConnection.getInstance()

// Define custom token for authenticated user
morgan.token('userId', (req) =>
  req.locals !== undefined ? req.locals?.id : '-'
)

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(
  morgan(
    'IP: :remote-addr ,UserId: :userId ,Date: :date[web] ,Method: :method ,URL: :url ,Status :status ,ResponseTime :response-time ms ,Content-Length :res[content-length]'
  )
)
app.use(cors())

// API Routes

// ping route
app.get('/traceability-node-api/api/v1/ping', async (req, res, next) => {
  res.send({ message: 'Awesome test works 🐻' })
})

// product routes
app.use(
  '/traceability-node-api/api/v1/product',
  require('./routes/productApi.route')
)

// lotApi routes
app.use('/traceability-node-api/api/v1/lot', require('./routes/lotApi.route'))

// batchApi routes
app.use(
  '/traceability-node-api/api/v1/batch',
  require('./routes/batchApi.route')
)

// farmerApi routes
app.use(
  '/traceability-node-api/api/v1/farmer',
  require('./routes/farmerApi.route')
)

// farmerProduceApi routes
app.use(
  '/traceability-node-api/api/v1/farmerProduce',
  require('./routes/farmerProduceApi.route')
)

// modalFields routes
app.use(
  '/traceability-node-api/api/v1/modalFields',
  require('./routes/modalFieldApi.route')
)

// global routes
app.use(
  '/traceability-node-api/api/v1/global',
  require('./routes/globalApi.route')
)

app.use((req, res, next) => {
  next(createError.NotFound())
})

app.use((err, req, res, next) => {
  res.status((err.status !== undefined ? err.status : 500) as number)
  res.send({
    status: (err.status !== undefined ? err.status : 500) as number,
    message: err.message
  })
})

const PORT = process.env.PORT !== undefined ? process.env.PORT : 3000
app.listen(PORT, () => {
  console.log(`🚀 @ http://localhost:${PORT}/traceability-node-api/api/v1/ping`)
})
