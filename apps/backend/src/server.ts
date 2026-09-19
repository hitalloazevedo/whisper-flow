import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'whisper-flow-api' })
})

app.get('/api/jobs', (_request, response) => {
  response.json({ jobs: [] })
})

app.listen(port, () => {
  console.log(`Whisper Flow API listening on http://localhost:${port}`)
})
