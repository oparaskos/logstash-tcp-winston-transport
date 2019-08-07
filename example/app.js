const { createLogger, format } = require('winston');
const { combine, timestamp, label, prettyPrint, json } = format;

const logstashTcpWins = require('..');

const logger = createLogger({
    format: combine(
        label({ label: 'right meow!' }),
        timestamp(),
        prettyPrint(),
        json()
    ),
    transports: [
        new logstashTcpWins({
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
}, 100)
