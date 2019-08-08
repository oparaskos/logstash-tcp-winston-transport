const { instances } = require("./logstash-tcp");

/**
 * **Flush log messages and close sockets to logstash.**
 *
 * Allow logstash transport to continue trying to
 * send up until `_timeout` is reached
 *
 * When all messages are sent, the timeout is reached,
 * or the retry mechanism fails then close any sockets
 * and resolve/reject.
 *
 * This is Particularly of relevance to applications which
 * run inside cloud functions as open sockets leave the
 * process running.
 * 
 * ### Example Usage
 * ```
 *     const logger = createLogger({ transports: [new LogstashTCP()]})
 *     // ... Some other Application Things...
 *     logger.info({ message: "This should go to logstash." });
 *     // ... Some other Application Things...
 *     flushAndClose()
 *         .catch((err) => {
 *             console.error(err);
 *             process.exit(1)
 *         });
 * ```
 * 
 * @param {number} _timeout the maximum amount of millis to wait, default 10 seconds.
 * @returns {Promise<void>} `resolve` if flushed and closed successfully, `reject` if an error or timeout occurs.
 */
function flushAndClose(_timeout) {
    const timeout = _timeout || 10000;
    const start = new Date().getTime();
    return new Promise((resolve, reject) => {
        let interval = setInterval(() => {
            function end() {
                clearInterval(interval);
                interval = null;
                for (const instance of instances) {
                    instance.close();
                }
            }
            try {
                const hasMessages = instances
                    .filter((instance) => !instance._silent && instance._retrying || instance._connected)
                    .some((instance) => instance._logQueue.length > 0);
                if (!hasMessages) {
                    end();
                    resolve();
                    return;
                }
                if (new Date().getTime() > start + timeout) {
                    end();
                    throw new Error("Timeout exceeded");
                }
            }
            catch (e) {
                const err = new Error("Error flushing log messages: " + e.message);
                err.cause = e;
                reject(err);
            }
        }, Math.min(10, timeout / 10));
    });
}

module.exports = { flushAndClose };
