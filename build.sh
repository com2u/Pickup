chmod +x run.sh
chmod +x build.sh
docker build -t Pickup --progress=plain . 2>&1 | tee docker-build.log
