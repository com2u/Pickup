# Pickup

A web application for managing group community orders and deliveries. This application helps coordinate orders among multiple users, track balances, and manage deliveries efficiently.

![Order]([http://url/to/img.png](https://github.com/com2u/Pickup/blob/main/images/order1.png))
![Order2]([http://url/to/img.png](https://github.com/com2u/Pickup/blob/main/images/order2.png))
![Overview]([http://url/to/img.png](https://github.com/com2u/Pickup/blob/main/images/overview.png))



## Project Structure

### Root Directory
```
├── docker-compose.yml       # Main Docker configuration for all services
├── setup-docker.sh         # Setup script for Docker environment
├── recreate-db.sh         # Script to reset and initialize database
└── data/                  # Persistent data directory (created by Docker)
    ├── db/                # Database files
    └── logs/              # Application logs
```

### Frontend Structure
```
frontend/
├── Dockerfile            # Frontend container build configuration
├── nginx.conf           # Nginx web server configuration
├── .env                 # Runtime environment variables
└── src/
    ├── components/      # React components
    │   ├── Layout.js    # Main application layout
    │   ├── Login.js     # Login page
    │   ├── Order.js     # Order management
    │   ├── Overview.js  # Dashboard view
    │   ├── Delivery.js  # Delivery management
    │   ├── Balance.js   # Balance/payment view
    │   ├── Users.js     # User management (admin)
    │   └── ItemList.js  # Reusable item listing
    └── contexts/        # React context providers
        ├── AuthContext.js    # Authentication state
        └── ThemeContext.js   # Theme management
```

### Backend Structure
```
backend/
├── Dockerfile           # Backend container build configuration
├── .env                # Runtime environment variables
└── src/
    ├── index.js        # Server entry point
    ├── config.js       # Server configuration
    ├── db/             # Database management
    ├── middleware/     # Express middleware
    ├── routes/         # API routes
    └── utils/          # Utility functions
```

## Features

### Order Management
- Place and modify food orders
- Real-time order updates
- Item quantity management
- Price adjustments
- Order overview with user-specific views

### Overview Dashboard
- Complete order overview
- Edit mode for bulk updates
- User-specific order summaries
- Total cost calculations

### Delivery Management
- Delivery tracking
- Price adjustments during delivery
- Order confirmation system
- Automatic balance updates upon delivery

### Balance System
- Track user balances
- View balance history
- Apply balance corrections
- Automatic balance updates after deliveries

### User Management
- User registration and authentication
- Admin panel for user management
- Password change functionality
- User deletion (admin only)

## Installation

You can run the application either in development mode or using Docker.

### Docker Deployment

1. Prerequisites:
   - Docker
   - Docker Compose

2. Setup and Run:
   ```bash
   # Initial setup
   ./setup-docker.sh

   # Build containers
   docker-compose build --no-cache

   # Start services
   docker-compose up -d
   ```

3. Access Points:
   - Frontend: http://<host-ip>:80
   - Backend API: http://<host-ip>:3002

### Local Development Setup

1. Prerequisites:
   - Node.js (v14 or higher)
   - npm or yarn
   - SQLite3

2. Install Dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up the database:
   ```bash
   ./recreate-db.sh
   ```

4. Start Development Servers:
   ```bash
   # Start backend (from backend directory)
   npm start

   # Start frontend (from frontend directory)
   npm start
   ```

## Development

### Component Relationships
- Layout.js: Contains navigation and theme switching
- AuthContext: Manages user session across all components
- ThemeContext: Handles dark/light mode preferences
- ItemList: Reused in Order.js and Overview.js

### Data Flow
- Frontend → Nginx → Backend API → SQLite Database
- Real-time updates through periodic polling
- Client-side state management with React Context

### Debugging

The application includes comprehensive logging for debugging purposes:

1. Component Logs:
   - `[Order]` - Order component logs
   - `[Overview]` - Overview component logs
   - `[Balance]` - Balance component logs
   - `[Delivery]` - Delivery component logs
   - `[Users]` - Users component logs

2. Backend Logs:
   - Location: `data/logs/app.log`
   - Error logs: Detailed error tracking
   - Access logs: Request/response monitoring

3. Debug Tools:
   - Chrome DevTools for frontend
   - VS Code debugger for backend
   - Docker logs for container issues
   - SQLite browser for database inspection

## Docker Configuration

### Container Architecture
1. Frontend Container:
   - Nginx serving static React build
   - Health check endpoint
   - Environment variables injected at build time

2. Backend Container:
   - Node.js Express server
   - SQLite database
   - Volume mounts for persistence
   - Non-root user for security

### Volume Management
- Database persistence: db_data volume
- Log persistence: log_data volume
- Host-mounted volumes for easy access

### Security Considerations
- Non-root container users
- Read-only environment files
- Secure headers in nginx
- JWT token authentication

## Troubleshooting

### Container Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f [service]

# Restart services
docker-compose restart [service]
```

### Common Problems
- Port conflicts: Check ports 80 and 3002
- Database errors: Check data/db permissions
- CORS issues: Verify frontend API_URL
- Build errors: Clear Docker cache and rebuild

## License

This project is licensed under the MIT License - see the LICENSE file for details.
