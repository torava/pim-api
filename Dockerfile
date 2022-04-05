FROM node:14
COPY . /opt/bookkeepr
WORKDIR /opt/bookkeepr
EXPOSE 42808
ARG NPM_TOKEN  
COPY .npmrc .npmrc  
COPY package.json package.json 
CMD ls -ltr && \
npm ci && \
NODE_OPTIONS=--max_old_space_size=8192 npm run build && \
#if MIGRATE == "true" ; \ then
npm run knex migrate:latest && \
npm run knex seed:run && \
#else echo Migration skipped ; fi && \
npm run start
