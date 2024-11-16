# proxy
TINYPROXY:
docker run -d --name=tinyproxy --restart=unless-stopped -p 8787:8888 -e BASIC_AUTH_USER="user" -e BASIC_AUTH_PASSWORD="password" monokal/tinyproxy:latest ANY

DUMBPROXY:
docker run -d --security-opt no-new-privileges -p 8787:8080 --restart unless-stopped --name dumbproxy ghcr.io/senseunit/dumbproxy -auth 'static://?username=username&password=password'

Файлы - proxy extension for google chrome
