export const ADMIN_REPO = process.env.ADMIN_REPO
export const USER_AGENT = process.env.USER_AGENT
export const CONNECTION_STRING = process.env.DATABASE_URL
export const PORT = process.env.PORT || 5000
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN
export const NPM_REGISTRY = process.env.NPM_REGISTRY || 'https://registry.npmjs.org'

console.log(`ADMIN_REPO: ${ADMIN_REPO}`)
console.log(`USER_AGENT: ${USER_AGENT}`)
console.log(`CONNECTION_STRING: ${CONNECTION_STRING}`)
console.log(`PORT: ${PORT}`)
console.log(`NPM_REGISTRY: ${NPM_REGISTRY}`)
