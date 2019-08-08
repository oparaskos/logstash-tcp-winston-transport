const { createLogger, format } = require('winston');
const { combine, timestamp, label, prettyPrint, json } = format;

const { LogstashTCP, flushAndClose } = require('..');

const logger = createLogger({
    format: combine(
        label({ label: 'right meow!' }),
        timestamp(),
        prettyPrint(),
        json()
    ),
    transports: [
        new LogstashTCP({
            level: "debug",
            port: 5000,
            json: true,
            host: "localhost",
            retryInterval: 2000,
            maxRetries: 3,
            label: "MyTestLabel",
        })
    ],
    exitOnError: false
})

let x = 0;

let interval = setInterval(() => {
    logger.debug({
        stuff: "Hi!",
        id: 1 + x++
    });
    if (x >= 100) {
        clearInterval(interval);
        interval = null;
        process.exit(0);
    }
}, 100);

// Gracefully wait for the log messages to finish getting to logstash before exit.
flushAndClose()
    .catch((err) => {
        console.error(err);
        process.exit(1)
    });