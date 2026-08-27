import { createLogger, format, transports } from 'winston';

import { logFormat } from './logger-wrapper';

const { combine, timestamp, label, colorize } = format;

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default to 'info', can be overridden by environment variable
    format: combine(
        label({ label: 'instana-integration' }),
        timestamp(),
        colorize(),
        logFormat
    ),
    transports: [
        new transports.Console()
    ]
});

export default logger;
