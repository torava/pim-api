FROM node:14
COPY . /opt/bookkeepr
WORKDIR /opt/bookkeepr
EXPOSE 42808
ARG NPM_TOKEN  
ARG MIGRATE
CMD ls -ltr && \
npm config set '//gitlab.com/api/v4/projects/32804813/packages/npm/:_authToken' "${NPM_TOKEN}" \
npm ci && \
NODE_OPTIONS=--max_old_space_size=8192 npm run build && \
if MIGRATE == "true" ; \
npm run knex migrate:latest && \
npm run knex seed:run && \
else echo Migration skipped ; fi && \
npm run start
