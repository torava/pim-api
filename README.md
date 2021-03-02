# Installing

``
sudo yum update -y
sudo apt-get install 
sudo yum install docker
mkdir docker
cd docker
cd docker/
mkdir bookkeepr
cd bookkeepr/
nano docker-compose.yml
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/download/1.28.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo reboot
sudo chmod 666 /var/run/docker.sock
docker login registry.gitlab.com/torava/bookkeepr
docker compose up -d
docker container ls
``