import Fastify from 'fastify'
import cors from '@fastify/cors'
import 'dotenv/config'

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
})

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Documents endpoint (placeholder)
fastify.get('/api/documents', async (request, reply) => {
  // TODO: Validate Azure AD token from header, fetch from Blob Storage
  return {
    documents: [
      { id: '1', name: 'Beispiel Dokument.pdf', uploadedAt: '2025-12-01T10:00:00Z' },
      { id: '2', name: 'Checkliste.docx', uploadedAt: '2025-12-15T14:30:00Z' },
    ],
  }
})

// Secrets endpoint (placeholder – reference Key Vault in production)
fastify.get('/api/secrets', async (request, reply) => {
  // TODO: Validate token, fetch from Key Vault, return metadata only (no actual secrets)
  return {
    secrets: [
      { id: '1', name: 'Praxis Email Password', lastUpdated: '2025-11-20' },
      { id: '2', name: 'Router Admin', lastUpdated: '2025-10-05' },
    ],
  }
})

const start = async () => {
  try {
    const port = process.env.PORT || 3000
    await fastify.listen({ port: Number(port), host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
