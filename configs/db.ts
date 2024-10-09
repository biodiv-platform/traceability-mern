const mongoose = require('mongoose')

let instance

async function createConnection() {
  if (!instance) {
    instance = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
  }

  console.log(`MongoDB Connected: ${instance.connection.host}`)

  return instance.connection.db
}

const mongooseConnection = {
  getInstance: async () => {
    return await createConnection()
  }
}

export { mongooseConnection }
