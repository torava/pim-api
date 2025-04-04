# Installing
```
psql
DROP DATABASE "product-api"; CREATE DATABASE "product-api"; \q
npm run knex migrate:latest
npm run knex seed:run
npm run dev
```

# Deployment
```
sudo yum update -y
sudo apt-get install 
sudo yum install docker
mkdir -p docker/bookkeepr
cd docker/bookkeepr
nano docker-compose.yml
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/download/1.28.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo chmod 666 /var/run/docker.sock
docker login registry.gitlab.com/torava/bookkeepr
docker compose up -d
docker container ls
```