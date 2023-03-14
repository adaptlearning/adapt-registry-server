# Adapt plugin registry server

```sh
env DATABASE_URL=$(heroku config:get DATABASE_URL -a adapt-bower-repository) ADMIN_REPO=https://github.com/adaptlearning/adapt_framework USER_AGENT=adapt-bower-repository PORT=5000 GITHUB_TOKEN= node index.js
```
