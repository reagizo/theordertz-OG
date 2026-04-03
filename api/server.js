import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Import the built server
const { createRequestHandler } = await import(join(__dirname, '../dist/server/server.js'))

const server = createServer(createRequestHandler)

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})