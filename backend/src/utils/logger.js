const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create write stream for logging
const logStream = fs.createWriteStream(config.logging.file, { flags: 'a' });

// Format timestamp for log entries
const getTimestamp = () => new Date().toISOString();

// Log levels with numeric values for comparison
const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    // Convert string level to numeric value
    toNumber: (level) => {
        switch (level.toLowerCase()) {
            case 'error': return 0;
            case 'warn': return 1;
            case 'info': return 2;
            case 'debug': return 3;
            default: return 2; // default to INFO
        }
    }
};

// Get configured log level
const configuredLevel = LogLevel.toNumber(config.logging.level);

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

// Should log check based on configured level
const shouldLog = (level) => {
    return LogLevel.toNumber(level) <= configuredLevel;
};

// Logger functions
const logger = {
    info: (message, details = null) => {
        if (shouldLog('info')) {
            const logMessage = formatMessage('INFO', message, details);
            logStream.write(logMessage);
            if (config.server.env !== 'production') {
                console.log(logMessage);
            }
        }
    },

    error: (message, error = null) => {
        if (shouldLog('error')) {
            const logMessage = formatMessage('ERROR', message, error);
            logStream.write(logMessage);
            if (config.server.env !== 'production') {
                console.error(logMessage);
            }
        }
    },

    debug: (message, details = null) => {
        if (shouldLog('debug')) {
            const logMessage = formatMessage('DEBUG', message, details);
            logStream.write(logMessage);
            if (config.server.env !== 'production') {
                console.debug(logMessage);
            }
        }
    },

    warn: (message, details = null) => {
        if (shouldLog('warn')) {
            const logMessage = formatMessage('WARN', message, details);
            logStream.write(logMessage);
            if (config.server.env !== 'production') {
                console.warn(logMessage);
            }
        }
    }
};

// Handle process termination
process.on('exit', () => {
    logStream.end();
});

module.exports = logger;
