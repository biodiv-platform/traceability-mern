import { niceLog } from './utils'
import { connectDB } from './configs/db'

const express = require('express')
const createError = require('http-errors')
const morgan = require('morgan')
const cors = require('cors')
const swaggerUIPath = require('swagger-ui-express')
const swaggerjsonFilePath = require('./docs/swagger.json')

require('dotenv').config()

const app = express()

// connect to mongodb
void connectDB()

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

// Middleware to remove prefix from URL
app.use((req, res, next) => {
  if (req.url.startsWith('/traceability-node-api/api/v1')) {
    req.url = req.url.slice('/traceability-node-api/api/v1'.length)
  }
  next()
})

// API Routes

// ping route
app.get('/ping', async (req, res, next) => {
  res.send({ message: 'Awesome test works 🐻' })
})

// product routes
app.use('/product', require('./routes/productApi.route'))

// lotApi routes
app.use('/lot', require('./routes/lotApi.route'))

// containerApi routes
app.use('/container', require('./routes/containerApi.route'))

// batchApi routes
app.use('/batch', require('./routes/batchApi.route'))

// farmerApi routes
app.use('/farmer', require('./routes/farmerApi.route'))

// farmerProduceApi routes
app.use('/farmerProduce', require('./routes/farmerProduceApi.route'))

// modalFields routes
app.use('/modalFields', require('./routes/modalFieldApi.route'))

// global routes
app.use('/global', require('./routes/globalApi.route'))

app.use(
  '/api-docs',
  swaggerUIPath.serve,
  swaggerUIPath.setup(swaggerjsonFilePath)
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
  niceLog(`🚀 @ http://localhost:${PORT}/traceability-node-api/api/v1/ping`)
})
