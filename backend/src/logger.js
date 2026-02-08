// logger.js - Winston Logger Configuration

const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            if (stack) {
                return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
            }
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format((info) => {
                    const msg = info.message ? info.message.toLowerCase() : '';
                    const level = info.level ? info.level.toLowerCase() : '';

                    // Filter logic: Only show TX hashes, API requests, Errors, or Chain execution logs
                    const isTx = msg.includes('tx') || msg.includes('hash');
                    const isApi = msg.includes('request') || msg.includes('api');
                    const isError = level.includes('error');
                    const isChain = msg.includes('chain') || msg.includes('executed');

                    if (isTx || isApi || isError || isChain) {
                        return info;
                    }
                    return false; // Skip this log
                })(),
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            )
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

module.exports = logger;
