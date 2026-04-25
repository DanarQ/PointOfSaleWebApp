import express from 'express'
import cors from 'cors'
import { createAuthRouter, type AuthPrisma } from './routes/auth.js'
import { createProductsRouter, type ProductPrisma } from './routes/products.js'

type AppPrisma = ProductPrisma & { auth?: unknown }

export function createApp(prisma: AppPrisma) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  if (prisma.auth) {
    app.use('/auth', createAuthRouter(prisma as ProductPrisma & AuthPrisma))
  }

  app.use('/products', createProductsRouter(prisma))

  return app
}
