const winston = require('winston');
const config = require('./Config');

const logger = winston.createLogger({
  level: config.app.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const suffix = Object.keys(meta).length ? ` ${safeStringify(meta)}` : '';
      return `${timestamp} ${level}: ${stack || message}${suffix}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, nestedValue) => {
    if (nestedValue instanceof Error) {
      return {
        name: nestedValue.name,
        message: nestedValue.message,
        code: nestedValue.code,
        status: nestedValue.response?.status,
        url: nestedValue.config?.url,
        baseURL: nestedValue.config?.baseURL,
      };
    }

    if (typeof nestedValue === 'object' && nestedValue !== null) {
      if (seen.has(nestedValue)) return '[Circular]';
      seen.add(nestedValue);
    }

    return nestedValue;
  });
}

module.exports = logger;
