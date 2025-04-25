const fs = require('fs')

// Custom function to determine if message should be logged
export const skipLogging = (
  req: { method: string },
  res: { statusCode: number }
): boolean => {
  // Add conditions to skip logging here
  return res.statusCode <= 400
}

export const saveLogToFile = (
  log: any,
  apiName: string,
  isError = false
): void => {
  const logFolder = './logs'
  const logFile = `${logFolder}/${apiName}.log`

  // Get current timestamp
  const timestamp = new Date().toISOString()

  // Format log entry with timestamp
  const logEntry = isError
    ? `${timestamp} - Error: - ${JSON.stringify(log)}\n`
    : `${timestamp} - ${JSON.stringify(log)}\n`

  // Create log folder if it doesn't exist
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder)
  }

  // Write log to file
  fs.appendFileSync(logFile, logEntry)
}
