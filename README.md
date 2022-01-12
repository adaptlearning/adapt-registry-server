# Bower Server

```sh
env HEROKU_POSTGRESQL_RED_URL=$(heroku config:get HEROKU_POSTGRESQL_RED_URL -a app-name) ADMIN_REPO=https://github.com/owner/repo USER_AGENT=app-name PORT=5000 node index.js
```

Where app-name is your heroku App Name and ADMIN_REPO is an optional url of the github repo with your adminstrative collaborators.
