FROM node:14
COPY . /opt/bookkeepr
WORKDIR /opt/bookkeepr
EXPOSE 42808
CMD ls -ltr && \
npm ci && \
NODE_OPTIONS=--max_old_space_size=8192 npm run build && \
#if MIGRATE == "true" ; \ then
npm run knex migrate:latest && \
npm run knex seed:run && \
#else echo Migration skipped ; fi && \
npm run start
