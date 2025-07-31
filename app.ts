import logger from './utils/logger'
import { connectDB } from './configs/db'
import express from 'express'
import cors from 'cors'
import swaggerUIPath from 'swagger-ui-express'
import swaggerjsonFilePath from './docs/swagger.json'

require('dotenv').config()

const app = express()

// connect to mongodb
void connectDB()

// Basic logging middleware
app.use((req, res, next) => {
  const cleanUrl = req.originalUrl.replace('/traceability-node-api/api/v1', '')

  const ip = req.get('X-Forwarded-For') || req.ip

  req.log = logger.child({
    method: req.method,
    url: cleanUrl,
    ip
  })

  const start = Date.now()

  res.on('finish', () => {
    const responseTime = Date.now() - start

    if (res.statusCode < 400) {
      logger.info({
        method: req.method,
        url: cleanUrl,
        status: res.statusCode,
        responseTime,
        contentLength: res.get('Content-Length') || 0,
        ip
      })
    } else {
      logger.error({
        method: req.method,
        url: cleanUrl,
        status: res.statusCode,
        responseTime,
        contentLength: res.get('Content-Length') || 0,
        ip
      })
    }
  })

  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
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

const PORT = process.env.PORT !== undefined ? process.env.PORT : 3000
app.listen(PORT, () => {
  logger.info(
    `🚀 Server started on http://localhost:${PORT}/traceability-node-api/api/v1/ping`
  )
})
