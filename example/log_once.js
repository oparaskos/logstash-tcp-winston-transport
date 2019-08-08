const { createLogger, transports } = require('winston');

const { LogstashTCP, flushAndClose } = require('..');
const { instances } = require('../lib/logstash-tcp');

const logger = createLogger({
    transports: [
        new transports.Console({ level: 'debug' }),
        new LogstashTCP({ level: "info" })
    ],
    exitOnError: false
})

logger.debug({ message: "This should go to logstash and not to console." });
logger.info({ message: "This should go to logstash and also to console." });

// Gracefully wait for the log messages to finish getting to logstash before exit.
flushAndClose()
    .catch((err) => {
        console.error(err);
        process.exit(1)
    });
