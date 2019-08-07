
const { createServer } = require('net');
const { expect } = require('chai');

function createTestServer(opts) {
  opts = opts || {};
  let connections = 0;
  const recieved = [];
  const errors = [];
  let closed = 0;
  const server = createServer(onClientConnected);
  server.listen(opts.port || 0);

  const testServer = {
    address: () => server && server.address(),
    close: () => server && server.close(),
    recievedAtLeast,
    recievedExactlyOnce,
    recievedAtExactlyNTimes,
    connectedAtLeast,
    connectedExactlyOnce,
    connectedExactlyNTimes,
    closedAtLeast,
    closedExactlyOnce,
    closedExactlyNTimes,
    erroredAtLeast,
    erroredExactlyOnce,
    erroredExactlyNTimes,
  };

  function onClientConnected(sock) {
    ++connections;
    sock.on('data', (data) => {
      if (opts.printMessages) {
        console.log('LOG MESSAGE: ' + data)
      }
      recieved.push(data)
    });
    sock.on('close', () => {
      ++closed;
    });
    sock.on('error', (err) => {
      errors.push(err)
    });
  };

  function recievedAtLeast(n, matcher) {
    const matching = recieved.filter(v => matcher && matcher(v) || true);
    expect(matching.length).to.gte(n);
    return testServer;
  }

  function recievedExactlyOnce(matcher) {
    return recievedAtExactlyNTimes(1, matcher);
  }

  function recievedAtExactlyNTimes(n, matcher) {
    const matching = recieved.filter(v => matcher && matcher(v) || true);
    expect(matching.length).to.equal(n);
    return testServer;
  }

  function connectedAtLeast(n) {
    expect(connections).to.gte(n);
    return testServer;
  }

  function connectedExactlyOnce(n) {
    return connectedExactlyNTimes(1);
  }

  function connectedExactlyNTimes(n) {
    expect(connections).to.equal(n);
    return testServer;
  }

  function closedAtLeast(n) {
    expect(closed).to.gte(n);
    return testServer;
  }

  function closedExactlyOnce() {
    return closedExactlyNTimes(1);
  }

  function closedExactlyNTimes(n) {
    expect(closed).to.equal(n);
    return testServer;
  }

  function erroredAtLeast(n, matcher) {
    const matching = errors.filter(v => matcher && matcher(v) || true);
    expect(matching.length).to.gte(n);
    return testServer;
  }

  function erroredExactlyOnce(matcher) {
    return erroredExactlyNTimes(1, matcher);
  }

  function erroredExactlyNTimes(n, matcher) {
    const matching = errors.filter(v => matcher && matcher(v) || true);
    expect(matching.length).to.equal(n);
    return testServer;
  }

  return testServer;
}

module.exports = { createTestServer };