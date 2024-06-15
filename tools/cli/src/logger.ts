import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, printf, colorize } = format;

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default to 'info', can be overridden by environment variable
    format: combine(
        label({ label: 'stanctl' }),
        timestamp(),
        colorize(),
        logFormat
    ),
    transports: [
        new transports.Console()
    ]
});

export default logger;
