const { describe, it } = require('mocha');
const { expect } = require('chai');
const LogstashTCP = require('./index');
const { createTestServer } = require('./test/tcp-server');
const sinon = require('sinon');

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
      connectTimeout: 10 });
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
  it('should retry failed sends');
  it('should queue messages while the socket is disconnected');
  it('should flush message queue when socket becomes ready');
  it('should re-establish a failed socket', (done) => {
    // Close the server
    const port = testServer.address().port;
    testServer.close();
    setTimeout(() => {
      expect(logstashTCP._connected, "should be disconnected").to.be.false;
      expect(logstashTCP._retrying, "should be attempting to reconnect").to.be.true;
      // Restart the server
      testServer = createTestServer({port});
      setTimeout(() => {
          expect(logstashTCP._connected, "should be re-connected").to.be.true;
          testServer.connectedExactlyOnce();
          done();
      }, logstashTCP._retryInterval + logstashTCP._connectTimeout + 10)
    }, 5)
  });
  describe('Graceful Exit', () => {
    let closeStub;
    let sandbox;
    before(() => {
      sandbox = sinon.createSandbox();
      closeStub = sandbox.stub(logstashTCP, 'close');
    })
    after(() => {
      sandbox.restore();
    })
    it('should close the port when the program is terminated', (done) => {
      process.once('beforeExit', () => {
        sinon.assert.calledOnce(closeStub);
        done();
      });
      process.emit('beforeExit');
    });
  });
});
