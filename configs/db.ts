import logger from '../utils/logger'
const mongoose = require('mongoose')

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10
    })

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    logger.error({
      message: 'MongoDB connection failed',
      error: error instanceof Error ? error.message : String(error)
    })
    // exit the process on critical failure
    process.exit(1)
  }
}

export { connectDB }
