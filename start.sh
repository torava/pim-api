ls -ltr &&
npm config set '//gitlab.com/api/v4/projects/32804813/packages/npm/:_authToken' "${NPM_TOKEN}"
npm ci &&
NODE_ENV=production NODE_OPTIONS=--max_old_space_size=2048 npm run build &&
if [ "$MIGRATE" = "true" ]
then
NODE_ENV=production NODE_OPTIONS=--max_old_space_size=2048 npm run knex migrate:latest &&
NODE_ENV=production NODE_OPTIONS=--max_old_space_size=2048 npm run knex seed:run
else
echo Migration skipped
fi &&
NODE_ENV=production npm run start
