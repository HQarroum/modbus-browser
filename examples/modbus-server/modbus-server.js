const modbus = require('jsmodbus');
const net    = require('net');

// Creating a new TCP server.
const netServer = new net.Server()

// Creating a new modbus server.
const server = new modbus.server.TCP(netServer)

// Listening for connections.
server.on('connection', () => {
  console.log('Client connected');
});

// Starting the server.
netServer.listen(502);