import { connectDB } from './configs/db'

const express = require('express')
const createError = require('http-errors')
const morgan = require('morgan')
const cors = require('cors')

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

// Routes

// ping route
app.get('/ping', async (req, res, next) => {
  res.send({ message: 'Awesome test works 🐻' })
})

// lotApi routes
app.use('/v1/lot', require('./routes/lotApi.route'))

// batchApi routes
app.use('/v1/batch', require('./routes/batchApi.route'))

// farmerApi routes
app.use('/v1/farmer', require('./routes/farmerApi.route'))

// farmerProduceApi routes
app.use('/v1/farmerProduce', require('./routes/farmerProduceApi.route'))

// modalFields routes
app.use('/v1/modalFields', require('./routes/modalFieldApi.route'))

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
  console.log(`🚀 @ http://localhost:${PORT}/ping`)
})
