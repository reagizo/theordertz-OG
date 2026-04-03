import { createServer } from 'node:http'
import { createRequestHandler } from '@tanstack/react-start/server'

const server = createServer(createRequestHandler())

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})