const { createLogger, transports } = require('winston');

const Logstash = require('..');

const logger = createLogger({
    transports: [
        new transports.Console({level: 'debug'}),
        new Logstash({ level: "info" })
    ],
    exitOnError: false
})

logger.debug({ message: "This should go to logstash and not to console."});
logger.info({ message: "This should go to logstash and also to console."});
process.exit(0);