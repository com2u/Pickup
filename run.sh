chmod +x run.sh
chmod +x build.sh
docker stop Pickup
docker rm -f Pickup
docker run --name Pickup -v $(pwd)/.env:/app/.env -v $(pwd)/instance:/app/instance -v $(pwd)/src/settings.json:/app/src/settings.json --restart unless-stopped -p 5748:5000 -p 5749:3000 Pickup

