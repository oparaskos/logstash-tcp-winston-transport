const { LogstashTCP } = require('./lib/logstash-tcp');
const { flushAndClose } = require('./lib/flush-and-close');
module.exports = { LogstashTCP, flushAndClose };
