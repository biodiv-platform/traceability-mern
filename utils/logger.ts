// utils/logger.ts
import pino from 'pino'

const logger = pino({
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    }
  }
})

export default logger
