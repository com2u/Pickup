#!/bin/bash

# Clean up any existing containers and volumes
echo "Cleaning up existing containers and volumes..."
docker-compose down -v 2>/dev/null || true
docker system prune -f --volumes 2>/dev/null || true

# Remove existing volumes and images to ensure clean state
docker volume rm pickup_db_data pickup_log_data 2>/dev/null || true
docker rmi pickup_frontend pickup_backend 2>/dev/null || true

# Copy example environment files if they don't exist
if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env
fi

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
fi

echo "Setup complete!"
echo ""
echo "The following Docker volumes will be created:"
echo "├── db_data    (for database files)"
echo "└── log_data   (for log files)"
echo ""
echo "Environment files:"
echo "├── frontend/.env"
echo "└── backend/.env"
echo ""
echo "You can now run:"
echo "1. docker-compose build --no-cache    # Build the images fresh"
echo "2. docker-compose up -d               # Start the containers"
echo ""
echo "To check container status:"
echo "docker-compose ps"
echo ""
echo "To view container logs:"
echo "docker-compose logs -f"
echo ""
echo "Note: The containers may take up to 60 seconds to become healthy"
echo "      during the first startup while the database initializes."
