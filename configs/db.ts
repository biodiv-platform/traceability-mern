import { niceLog } from 'utils'

const mongoose = require('mongoose')

const connectDB = async (): Promise<void> => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10
  })

  niceLog(`MongoDB Connected: ${conn.connection.host}`)
}

export { connectDB } // to resolve typescript issue
