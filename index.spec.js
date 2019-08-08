const { describe, it } = require('mocha');
const { expect } = require('chai');
const { LogstashTCP } = require('.');
const { createTestServer } = require('./test/tcp-server');

describe('LogstashTCP', () => {
  let testServer;
  let logstashTCP;

  beforeEach(() => {
    testServer = createTestServer();
    logstashTCP = new LogstashTCP({
      port: testServer.address().port,
      host: "localhost",
      retryInterval: 20,
      maxRetries: 3,
      connectTimeout: 10,
      // verboseConnectionLogging: true
    });
  });
  afterEach(() => {
    testServer.close();
    logstashTCP.close();
  });
  it('should connect to the configured TCP port and hostname', (done) => {
    setTimeout(() => {
      testServer.connectedExactlyOnce();
      done();
    }, 10);
  });
  it('should send log messages to the tcp port', () => {
    logstashTCP.log('Hello World', () => {
      setTimeout(() => {
        testServer.recievedExactlyOnce((a) => a == "Hello World");
        done();
      }, 10);
    });
  });
  it('should allow JSON as messages', () => {
    logstashTCP.log({ test: 1, prop: { sub: 2 } }, () => {
      setTimeout(() => {
        testServer.recievedExactlyOnce((a) => a.test == 1 && a.prop);
        done();
      }, 10);
    });
  });
  it('should queue messages while the socket is disconnected', (done) => {
    // Close the server
    const port = testServer.address().port;
    testServer.close();
    setTimeout(() => {
      expect(logstashTCP._connected, "should be disconnected").to.be.false;
      expect(logstashTCP._retrying, "should be attempting to reconnect").to.be.true;
      const logStatements = [
        logAsPromise(logstashTCP, "This"),
        logAsPromise(logstashTCP, "Is"),
        logAsPromise(logstashTCP, "A"),
        logAsPromise(logstashTCP, "Message"),
      ]
      expect(logstashTCP._logQueue.length).to.equal(4);
      // Restart the server
      testServer = createTestServer({ port });
      setTimeout(() => {
        expect(logstashTCP._connected, "should be re-connected").to.be.true;
        Promise.all(logStatements)
          .then(() => {
            testServer.recievedExactlyNTimes(4);
          });
        done();
      }, logstashTCP._retryInterval + logstashTCP._connectTimeout + 10);

    }, 5);
  });
  it('should re-establish a failed socket', (done) => {
    // Close the server
    const port = testServer.address().port;
    testServer.close();
    setTimeout(() => {
      expect(logstashTCP._connected, "should be disconnected").to.be.false;
      expect(logstashTCP._retrying, "should be attempting to reconnect").to.be.true;
      // Restart the server
      testServer = createTestServer({ port });
      setTimeout(() => {
        expect(logstashTCP._connected, "should be re-connected").to.be.true;
        testServer.connectedExactlyOnce();
        done();
      }, logstashTCP._retryInterval + logstashTCP._connectTimeout + 10);
    }, 5);
  });
});

function logAsPromise(logstash, message) {
  return new Promise((resolve, reject) => {
    logstash.log(message, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  })
}