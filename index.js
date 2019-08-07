let net = require('net');
// let socket = new net.Socket();
const Transport = require('winston-transport');
module.exports = class LogstashTCP extends Transport {

    constructor(opts) {
        super(opts);
        const self = this;

        self._port = opts.port || 5000;
        self._host = opts.host || "localhost";
        self._label = opts.label;
        self._maxRetries = opts.maxRetries || 1000;
        self._retryInterval = opts.retryInterval || 100;
        self._connectTimeout = opts.connectTimeout || 3000;
        self._verboseConnectionLogging = opts.verboseConnectionLogging || false;
        self._logQueue = [];
        self._connected = false;
        self._terminate = false;
        self._silent = false;
        self._currentRetry = 0;
        self._retrying = false;
        self._socket = new net.Socket({
            writable: true,
            readable: false
        });
        self._socket.setDefaultEncoding("utf8");
        self.connect();
    }

    log(info, callback) {
        const self = this;
        callback = callback || (() => {});

        setImmediate(() => {
            self.emit('logged', info);
        });

        if (self._silent) {
            callback();
        }

        self._logQueue.push({ info, callback });
        if (self._connected) {
            self.processLogQueue();
        }
    }

    sendToLogstash(log, callback) {
        const self = this;
        try {
            self._socket.write(JSON.stringify(log) + "\n");
            self.emit('logged', log);
            callback();
            return true;
        } catch (e) {
            callback(e);
            return false;
        }
    }

    processLogQueue() {
        const self = this;
        while (self._logQueue.length > 0) {
            let log = self._logQueue.shift()
            self.sendToLogstash(log.info, log.callback);
        }
    }

    close() {
        const self = this;
        self._terminate = true;
        self._socket.end();
    }

    connect() {
        const self = this;
        self._socket.connect(self._port, self._host, function () {
            // socket.setKeepAlive(true, 30000);
        });

        self._socket.on("ready", (conn) => {
            self.processLogQueue();
        })

        if (self._verboseConnectionLogging) {
            for (const event of ["error", "data", "drain", "end", "lookup", "timeout"]) {
                self._socket.on(event, function () { console.info({ event: arguments }) })
            }
        } else {
            for (const event of ["error", "data", "drain", "end", "lookup", "timeout"]) {
                self._socket.on(event, () => { })
            }
        }

        self._socket.on("connect", () => {
            self._connected = true;
            self._retrying = false;
            self._currentRetry = 0;
        });

        self._socket.on("close", (msg) => {
            self._connected = false;
            if (!self._retrying && !self._terminate) {
                self.retryConnection();
            } else if (self._terminate) {
                self._socket.destroy();
            }
        })
    }

    retryConnection() {
        const self = this;
        if (self._currentRetry >= self._maxRetries) {
            self._silent = true;
            self._retrying = false;
            self.emit('error', new Error('Max retries reached, cannot reach logstash'));
            return false;
        } else {
            self._retrying = true;
        }
        setTimeout(() => {
            if(self._verboseConnectionLogging) {
                console.log({retry: {current: self._currentRetry, max: self._maxRetries}})
            }
            if (!self._socket.connecting) {
                self._currentRetry++;
                self._socket.connect(self._port, self._host);
            }
            function retryIfNotConnecting() {
                if (!self._connected && !self._socket.connecting) {
                    self.retryConnection();
                } else if (self._socket.connecting) {
                    setTimeout(retryIfNotConnecting, self._connectTimeout);
                }
            }
            setTimeout(retryIfNotConnecting, self._connectTimeout);
        }, self._retryInterval);
    }
};
