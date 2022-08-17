import gh from 'parse-github-url'
import { GITHUB_TOKEN, NPM_REGISTRY } from './constants.js'
import { getVersions, getVersion, getPackageJSON, getUrl } from './github.js'

export async function getRemoteRegistryEntry ({ name, version = '' }) {
  let url = `${NPM_REGISTRY}/${name}${version ? `/${version}` : ''}`
  let res = await getUrl({ url })
  const code = res.statusCode
  if (code !== 200 & code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    throw new Error('getRemoteRegistryEntry error')
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    res = await getUrl({ url })
  }
  return JSON.parse(res.body)
}

export async function searchRemoteRegistry ({ term }) {
  let url = `${NPM_REGISTRY}/-/v1/search?text=${term}&size=100`
  let res = await getUrl({ url })
  const code = res.statusCode
  if (code !== 200 & code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    throw new Error('searchRemoteRegistry error')
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    res = await getUrl({ url })
  }
  return JSON.parse(res.body)
}

export function attachNPMApi (app, packageTable, npmTable) {
  // Get database data
  app.get('/npm/', async (req, res) => {
    const packages = await packageTable.all()
    res.send({
      db_name: 'registry',
      doc_count: packages.length,
      doc_del_count: 0,
      update_seq: 0,
      purge_seq: 0,
      compact_running: false,
      disk_size: 0,
      data_size: 0,
      instance_start_time: 0,
      disk_format_version: 6,
      committed_update_seq: 0
    })
  })

  // Get named
  app.get('/npm/:name', async (req, res) => {
    let { name } = req.params
    if (name.includes('%2f')) name = name.replace('%2f', '/')
    const packageItem = await packageTable.find(name)
    if (!packageItem) {
      const remoteEntry = await getRemoteRegistryEntry({ name })
      if (!remoteEntry) return res.sendStatus(404)
      return res.send(remoteEntry)
    }
    await packageItem.hit()
    const url = packageItem.url
    try {
      const latestVersion = await getVersion({ url, token: GITHUB_TOKEN })
      const latestVersionName = latestVersion.tag_name.replace(/^v/, '')
      let npmItem = await npmTable.find(name)
      if (npmItem?.data?.version === latestVersionName) {
        return res.send(npmItem.data)
      }
      // fetch 100 versions + paginate entries, keep full history
      const versions = await getVersions({ url, token: GITHUB_TOKEN })
      const packageJSON = await getPackageJSON({ url })
      const output = {
        repository: {
          type: 'git',
          url
        },
        ...packageJSON || {},
        'dist-tags': {
          latest: latestVersionName
        },
        modified: latestVersion.published_at,
        name,
        versions: versions.reduce((output, version) => {
          const versionName = version.tag_name.replace(/^v/, '')
          return {
            ...output,
            [versionName]: {
              _hasShrinkwrap: false,
              directories: {},
              dist: {
                tarball: version.tarball_url
              },
              name,
              version: versionName
            }
          }
        }, {})
      }
      for (const version in output.versions) {
        output.versions[version] = Object.assign({}, (await getPackageJSON({ url, version: `v${version}` })) || {}, output.versions[version])
      }
      if (!npmItem) npmItem = npmTable.build({ name, data: output })
      else npmItem.update(output)
      npmItem.save()
      return res.send(output)
    } catch (err) {
      console.log(err)
      return res.sendStatus(404)
    }
  })

  // Get named+versioned
  app.get('/npm/:name/:version', async (req, res) => {
    let { name, version } = req.params
    if (name.includes('%2f')) name = name.replace('%2f', '/')
    const packageItem = await packageTable.find(name)
    if (!packageItem) {
      const remoteEntry = await getRemoteRegistryEntry({ name, version })
      if (!remoteEntry) return res.sendStatus(404)
      return res.send(remoteEntry)
    }
    await packageItem.hit()
    const url = packageItem.url
    try {
      const latestVersion = await getVersion({ url, token: GITHUB_TOKEN })
      const latestVersionName = latestVersion.tag_name.replace(/^v/, '')
      if (version === 'latest') version = latestVersionName
      let npmItem = await npmTable.find(name)
      if (npmItem?.data?.version === latestVersionName) {
        if (!npmItem.data.versions[version]) return res.sendStatus(404)
        return res.send(npmItem.data.versions[version])
      }
      const versions = await getVersions({ url, token: GITHUB_TOKEN })
      const packageJSON = await getPackageJSON({ url })
      const output = {
        repository: {
          type: 'git',
          url
        },
        ...packageJSON || {},
        'dist-tags': {
          latest: latestVersionName
        },
        modified: latestVersion.published_at,
        name,
        versions: versions.reduce((output, version) => {
          const versionName = version.tag_name.replace(/^v/, '')
          return {
            ...output,
            [versionName]: {
              _hasShrinkwrap: false,
              directories: {},
              dist: {
                tarball: version.tarball_url
              },
              name,
              version: versionName
            }
          }
        }, {})
      }
      for (const version in output.versions) {
        output.versions[version] = Object.assign({}, (await getPackageJSON({ url, version: `v${version}` })) || {}, output.versions[version])
      }
      if (!npmItem) npmItem = npmTable.build({ name, data: output })
      else npmItem.update(output)
      npmItem.save()
      if (!npmItem.data.versions[version]) return res.sendStatus(404)
      return res.send(npmItem.data.versions[version])
    } catch (err) {
      console.log(err)
      return res.sendStatus(404)
    }
  })

  // Search
  app.get('/npm/-/v1/search/', async (req, res) => {
    let {
      text = '', // string full-text search to apply
      size = 20, // integer how many results should be returned (default 20, max 250)
      from = 0 // integer offset to return results from
      // TODO: implement the below
      // quality, // float (0-1) how much of an effect should quality have on search results
      // popularity, // float (0-1) how much of an effect should popularity have on search results
      // maintenance // float (0-1) how much of an effect should maintenance have on search results
    } = req.query
    size = Math.max(Math.min(250, size), 0)
    const npmItems = await npmTable.search(text)
    const remote = await searchRemoteRegistry(text)
    const localNames = npmItems.map((npmItem) => npmItem.name.toLowerCase());
    const remoteObjects = remote.objects.filter(obj => obj.name && !localNames.includes(obj.name.toLowerCase()))
    const localObjects = npmItems.map(npmItem => {
      const author = gh(npmItem.data.repository?.url.replace('git:', 'https:'))?.owner
      const maintainers = author ? [{ username: author }] : null
      return {
        package: { date: npmItem.data.modified, maintainers, ...npmItem.data },
        score: {
          final: 1,
          defailt: {
            quality: 1,
            popularity: 1,
            maintenance: 1
          }
        }
      }
    })

    const unfilteredObjects = localObjects.concat(remoteObjects)
    res.send({
      objects: unfilteredObjects.slice(from, size),
      total: unfilteredObjects.length,
      time: 'Wed Jan 25 2017 19:23:35 GMT+0000 (UTC)'
    })
  })
}
