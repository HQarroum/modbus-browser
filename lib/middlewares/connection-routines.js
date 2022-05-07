const _       = require('lodash');
const net     = require('net');
const signale = require('signale');
const program = require('commander');
const Modbus  = require('jsmodbus');

/**
 * Exporting the initialization routines, ensuring
 * that the environment is properly configured.
 */
module.exports = [

  /**
   * Connecting to the server.
   */
  (input, output, next) => {
    let connected = false;
    // Creating a new TCP socket.
    input.socket = new net.Socket();
    // The unit identifier to use on the server.
    input.unitId = parseInt(program.unitId) || 1;
    // Creating a new Modbus TCP client.
    input.client = new Modbus.client.TCP(input.socket, input.unitId);
    // The remote server port.
    input.port   = _.isString(program.port) ? parseInt(program.port) : 502;
    // The connection options.
    input.opts   = { host: program.server, port: input.port };
    // Setting the socket timeout.
    input.socket.setTimeout(10 * 1000);
    // Listening for socket events.
    input.socket
      .on('connect', () => {
        connected = true;
        next();
      })
      .on('error', (err) => {
        input.socket.destroy();
        return (output.fail(err));
      })
      .on('timeout', () => {
        if (!connected) {
          input.socket.destroy();
          return (output.fail(`The connection to '${program.server}:${input.port}' has timed out.`));
        }
      });
    // Initiating the connection.
    signale.pending(`Initiating a connection to '${program.server}:${input.port}'`);
    input.socket.connect(input.opts);
  }
];