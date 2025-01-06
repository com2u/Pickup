#!/bin/bash
echo "Stopping running processes..."
pkill -f "node src/index.js"
sleep 2

echo "Recreating database..."
cd backend
node src/db/recreate.js
cd ..

echo "Restarting server..."
./run.sh
