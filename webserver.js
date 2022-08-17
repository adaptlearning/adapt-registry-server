import express from 'express'
import compression from 'compression'
import { getNPMTable, getPackageTable } from './database.js'
import { PORT } from './constants.js'
import { attachBowerApi } from './bower.js'
import { attachNPMApi } from './npm.js'

export async function start ({
  port = PORT
} = {}) {
  const packageTable = await getPackageTable()
  const npmTable = await getNPMTable()
  const app = express()
  app.use(compression({
    filter: function shouldCompress (req, res) {
      if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
      }
      // fallback to standard filter function
      return compression.filter(req, res)
    }
  }))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  attachBowerApi(app, packageTable)
  attachNPMApi(app, packageTable, npmTable)

  app.listen(port)
}
