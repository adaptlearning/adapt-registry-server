import { authorize } from './github.js'

export function attachBowerApi (app, packageTable) {
  // Get all
  app.get('/packages', async (req, res) => {
    const packages = await packageTable.all()
    res.send(packages)
  })

  // Get named
  app.get('/packages/:name', async (req, res) => {
    const { name } = req.params
    const packageItem = await packageTable.find(name)
    if (!packageItem) return res.sendStatus(404)
    await packageItem.hit()
    res.send(packageItem.toJSON())
  })

  // Search
  app.get('/packages/search/:term', async (req, res) => {
    const { term } = req.params
    const packages = await packageTable.search(term)
    res.send(packages)
  })

  // Register
  app.post('/packages', async (req, res) => {
    const { name, url } = req.body
    console.log(`Registering ${name} ${url}`)
    const packageItem = packageTable.build({ name, url })
    try {
      await packageItem.validate()
    } catch (validationError) {
      const firstError = validationError?.errors?.[0]
      const output = [firstError?.type, firstError?.message, firstError?.value].filter(Boolean).join(', ') || validationError
      console.error(output)
      return res.sendStatus(400)
    }
    try {
      await packageItem.register()
    } catch (err) {
      console.error(err)
      return res.sendStatus(406)
    }
    res.sendStatus(201)
  })

  // Rename
  app.get('/packages/rename/:username/:oldPluginName/:newPluginName', async (req, res) => {
    const { username, oldPluginName, newPluginName } = req.params
    const { access_token: token } = req.query
    console.log(`Renaming ${oldPluginName} to ${newPluginName}`)
    try {
      const packageItem = await packageTable.find(oldPluginName)
      if (!packageItem) return res.sendStatus(404)
      const { url } = packageItem
      if (!await authorize({ username, url, token })) {
        console.error('Rename failed unable to authorise')
        return res.sendStatus(500)
      }
      await packageItem.rename(newPluginName)
    } catch (err) {
      console.error('Rename failed', err)
      return res.sendStatus(500)
    }
    res.sendStatus(201)
  })

  // Unregister
  app.delete('/packages/:username/:pluginName', async (req, res) => {
    const { username, pluginName } = req.params
    const { access_token: token } = req.query
    console.log(`Unregister ${pluginName}`)
    try {
      const packageItem = await packageTable.find(pluginName)
      if (!packageItem) throw new Error(`${pluginName} not found`)
      const { url } = packageItem
      if (!await authorize({ username, url, token })) {
        console.error('Delete failed unable to authorise')
        return res.sendStatus(500)
      }
      const count = await packageTable.unregister(pluginName)
      if (count <= 0) return res.sendStatus(404)
      console.log('Successfully deleted package ' + pluginName)
    } catch (err) {
      console.error('Unregister failed with error', err)
      return res.sendStatus(404)
    }
    res.sendStatus(204)
  })

  // Authentication test
  app.get('/authenticate/:username/:pluginName', async (req, res) => {
    const { username, pluginName } = req.params
    const { access_token: token } = req.query
    console.log(`Authenticate ${username} for ${pluginName}`)
    try {
      const packageItem = await packageTable.find(pluginName)
      if (!packageItem) throw new Error(`${pluginName} not found`)
      const { url } = packageItem
      const type = await authorize({ username, url, token })
      if (!type) {
        console.error('Authenticate failed unable to authorise')
        return res.sendStatus(500)
      }
      console.log(`Successfully authenticated ${username} as ${type}`)
      return res.send({ type })
    } catch (err) {
      console.error('Authentication failed with error', err)
      return res.sendStatus(404)
    }
  })
}
