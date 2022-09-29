import request from 'request'
import gh from 'parse-github-url'
import { USER_AGENT, ADMIN_REPO } from './constants.js'

export async function isGitHub ({ url }) { return /:\/\/github.com\//.test(url) }

export async function authorize ({
  url,
  username,
  token
} = {}) {
  if (isGitHub(url)) {
    try {
      // Check collaborators for the given repo
      if (!await checkCollaborators({ username, url, token })) return
      // User is a collaborator on the given repo
      console.log(username, 'is a collaborator')
      return 'collaborator'
    } catch (err) {}
  }
  // If no admin repo is specified, throw error immediately
  if (!ADMIN_REPO) {
    console.log('No ADMIN_REPO defined')
    return false
  }
  // Check if the user is a collaborator on the admin repo
  if (!await checkCollaborators({
    username,
    url: ADMIN_REPO,
    token
  })) return false
  // User is a collaborator on the admin repo
  console.log(username, 'is an admin')
  return 'admin'
}

export async function checkCollaborators ({
  username,
  url,
  token
}) {
  if (!isGitHub(url)) {
    console.log('checkCollaborators passed a non-github url')
    return false
  }
  url = 'https://api.github.com/repos/' + gh(url).repo + '/collaborators/' + username
  const res = await getUrl({ url, token })
  const code = res.statusCode
  if (code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    console.log('Could not check collaborators')
    return false
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    return await getUrl({ username, url, token })
  }
  // GitHub returns 204 if user is collaborator
  return true
}

export async function getVersions ({ url, token }) {
  if (!isGitHub(url)) {
    console.log('getVersions passed a non-github url')
    return false
  }
  url = `https://api.github.com/repos/${gh(url).repo}/releases?per_page=100`
  let res = await getUrl({ url, token })
  const code = res.statusCode
  if (code !== 200 & code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    console.log(`Could not get versions for ${url}, ${res.status}`)
    return false
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    res = await getUrl({ url, token })
  }
  return JSON.parse(res.body)
}

export async function getVersion ({ url, token, version = 'latest' }) {
  if (!isGitHub(url)) {
    console.log('getVersion passed a non-github url')
    return false
  }
  url = `https://api.github.com/repos/${gh(url).repo}/releases/${version}`
  let res = await getUrl({ url, token })
  const code = res.statusCode
  if (code !== 200 & code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    console.log(`Could not get version for ${url} ${version}, ${res.statusMessage}`)
    return false
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    res = await getUrl({ url, token })
  }
  return JSON.parse(res.body)
}

export async function getPackageJSON ({ url, version = 'master' }) {
  const res = await getFirst({
    urls: [
      `https://raw.githubusercontent.com/${gh(url).repo}/${version}/package.json`,
      `https://raw.githubusercontent.com/${gh(url).repo}/${version}/bower.json`
    ]
  })
  try {
    return res && JSON.parse(res.body)
  } catch (err) {
    return null
  }
}

export async function getFirst ({ urls }) {
  for (let url of urls) {
    let res = await getUrl({ url })
    const code = res.statusCode
    if (code !== 200 & code !== 204 && code !== 301 && code !== 302 && code !== 307) {
      continue
    }
    // Follow a redirect if necessary
    if (code === 301 || code === 302 || code === 307) {
      url = res.headers.location
      res = await getUrl({ url })
    }
    return res
  }
  return null
}

export async function getUrl ({ url, token, method = 'GET' }) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': USER_AGENT }
    if (token) headers.Authorization = 'token ' + token
    request({
      url,
      method,
      headers,
      followRedirect: false
    }, function (err, res) {
      if (err) return reject(err)
      resolve(res)
    })
  })
}
