// Custom function to determine if message should be logged
export const skipLogging = (
  req: { method: string },
  res: { statusCode: number }
): boolean => {
  // Add conditions to skip logging here
  console.log(`${req.method} ${res.statusCode}`)
  return res.statusCode <= 400
}
