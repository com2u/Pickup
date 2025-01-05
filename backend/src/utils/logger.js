const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'backend.log');

// Create write stream for logging
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Format timestamp for log entries
const getTimestamp = () => new Date().toISOString();

// Log levels
const LogLevel = {
    INFO: 'INFO',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    WARN: 'WARN'
};

// Format message with timestamp and level
const formatMessage = (level, message, details = null) => {
    const timestamp = getTimestamp();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (details) {
        if (details instanceof Error) {
            logMessage += `\n  Error: ${details.message}`;
            if (details.stack) {
                logMessage += `\n  Stack: ${details.stack}`;
            }
        } else {
            logMessage += `\n  Details: ${JSON.stringify(details, null, 2)}`;
        }
    }
    
    return logMessage + '\n';
};

// Logger functions
const logger = {
    info: (message, details = null) => {
        const logMessage = formatMessage(LogLevel.INFO, message, details);
        logStream.write(logMessage);
        if (process.env.NODE_ENV !== 'production') {
            console.log(logMessage);
        }
    },

    error: (message, error = null) => {
        const logMessage = formatMessage(LogLevel.ERROR, message, error);
        logStream.write(logMessage);
        if (process.env.NODE_ENV !== 'production') {
            console.error(logMessage);
        }
    },

    debug: (message, details = null) => {
        if (process.env.NODE_ENV !== 'production') {
            const logMessage = formatMessage(LogLevel.DEBUG, message, details);
            logStream.write(logMessage);
            console.debug(logMessage);
        }
    },

    warn: (message, details = null) => {
        const logMessage = formatMessage(LogLevel.WARN, message, details);
        logStream.write(logMessage);
        if (process.env.NODE_ENV !== 'production') {
            console.warn(logMessage);
        }
    }
};

// Handle process termination
process.on('exit', () => {
    logStream.end();
});

module.exports = logger;
