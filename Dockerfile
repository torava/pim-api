FROM node:24
COPY . /opt/bookkeepr
WORKDIR /opt/bookkeepr
EXPOSE 42808
ARG NPM_TOKEN  
ARG MIGRATE
CMD ./start.sh