import express from 'express'
import cors from 'cors'
import { createProductsRouter, type ProductPrisma } from './routes/products.js'

export function createApp(productPrisma: ProductPrisma) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/products', createProductsRouter(productPrisma))

  return app
}
