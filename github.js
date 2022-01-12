import request from 'request'
import gh from 'parse-github-url'
import { USER_AGENT, ADMIN_REPO } from './constants.js'

export async function authorize ({
  username,
  url,
  token
}) {
  try {
    // Check collaborators for the given repo
    await checkCollaborators({ username, url, token })
    // User is a collaborator on the given repo
    console.log(username, 'is a collaborator')
    return
  } catch (err) {
    // If no admin repo is specified, throw error immediately
    if (!ADMIN_REPO) throw err
  }
  // Check if the user is a collaborator on the admin repo
  await checkCollaborators({
    username,
    url: ADMIN_REPO,
    token
  })
  // User is a collaborator on the admin repo
  console.log(username, 'is an admin collaborator')
}

async function checkCollaborators ({
  username,
  url,
  token
}) {
  url = 'https://api.github.com/repos/' + gh(url).repo + '/collaborators/' + username
  const res = await getCollaborators({ url, token })
  const code = res.statusCode
  if (code !== 204 && code !== 301 && code !== 302 && code !== 307) {
    throw new Error('checkCollaborators error')
  }
  // Follow a redirect if necessary
  if (code === 301 || code === 302 || code === 307) {
    url = res.headers.location
    return await checkCollaborators({ username, url, token })
  }
  // GitHub returns 204 if user is collaborator
}

async function getCollaborators ({ url, token }) {
  return new Promise((resolve, reject) => {
    request({
      url,
      method: 'GET',
      headers: { Authorization: 'token ' + token, 'User-Agent': USER_AGENT },
      followRedirect: false
    }, function (err, res) {
      if (err) return reject(err)
      resolve(res)
    })
  })
}
