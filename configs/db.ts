const mongoose = require('mongoose')

const connectDB = async (): Promise<void> => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  console.log(`MongoDB Connected: ${conn.connection.host}`)
}

export { connectDB } // to resolve typescript issue
