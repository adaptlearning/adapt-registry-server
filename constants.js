export const ADMIN_REPO = process.env.ADMIN_REPO
export const USER_AGENT = process.env.USER_AGENT
export const CONNECTION_STRING = process.env.HEROKU_POSTGRESQL_RED_URL
export const PORT = process.env.PORT || 5000

console.log(`ADMIN_REPO: ${ADMIN_REPO}`)
console.log(`USER_AGENT: ${USER_AGENT}`)
console.log(`CONNECTION_STRING: ${CONNECTION_STRING}`)
console.log(`PORT: ${PORT}`)
