import pino from 'pino'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Ensure logs directory exists
const logsDir = join(__dirname, '../logs')
if (!existsSync(logsDir)) {
  mkdirSync(logsDir)
}

const logger = pino({
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: { colorize: true },
        level: 'info'
      },
      {
        target: 'pino/file',
        options: { destination: join(__dirname, '../logs/app.log') },
        level: 'info'
      }
    ]
  }
})

export default logger
