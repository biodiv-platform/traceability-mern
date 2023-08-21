import { authorization } from './services'
import { connectDB } from './configs/db'
import { skipLogging } from './utils'

const express = require('express')
const createError = require('http-errors')
const morgan = require('morgan')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

const Product = require('./models/Product.model')

const app = express()

// connect to mongodb
void connectDB()

// Create a write stream to the log file
const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a'
})

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
    // { stream: logStream, skip: skipLogging } //TODO: uncomment me
  )
)
app.use(cors())

// Routes

//TODO: remove this route
app.get('/', authorization('UNION'), async (req, res, next) => {
  res.send({ message: 'Awesome it works with authorization 🐻' })
})

// testing route
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

app.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find()
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

app.get('/products/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const products = await Product.findById(productId)
    res.status(200).json(products)
  } catch (err) {
    next(err)
  }
})

app.post('/products', async (req, res, next) => {
  try {
    const { productName, description, columns } = req.body

    const product = new Product({
      productName,
      description,
      columns
    })

    const createdProduct = await product.save()
    res.status(201).json(createdProduct)
  } catch (err) {
    next(err)
  }
})

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
  console.log(`🚀 @ http://localhost:${PORT}`)
})
