const _       = require('lodash');
const program = require('commander');
const signale = require('signale');
const Chain   = require('middleware-chain-js');

// Instanciating the middleware chain.
const chain = new Chain();

/**
 * Command-line interface.
 */
program
  .name('modbus-browser write-single-register')
  .description('Writes the given value of a register at the given address.')
  .option('-s, --server <hostname>', 'The hostname or IP address of the Modbus server to initiate a connection to.')
  .option('-p, --port <port>', 'The port of the Modbus server to initiate a connection to (set to `502` by default).')
  .option('-u, --unit-id <unitId>', 'The unit identifier to perform the action on (set to `1` by default).')
  .option('-a, --address <address>', 'The address of the register to be written.')
  .option('-v, --value <value>', 'The value of the register to be written.')
  .parse(process.argv);

/**
 * Injecting the initialization routines into the `chain`.
 */
chain.use(require('./lib/middlewares/initialization-routines'));

/**
 * Verifying that the given arguments are valid.
 */
chain.use((input, output, next) => {
  if (!_.isString(program.server)) {
    return (output.fail(`The hostname or IP address of the Modbus server to connect to is expected.`));
  }
  if (!_.isString(program.address)) {
    return (output.fail(`The address at which the value must be written should be a valid number.`));
  }
  if (_.isString(program.unitId) && isNaN(parseInt(program.unitId, 10))) {
    return (output.fail(`The unit identifier must be a valid number.`));
  }
  if (!_.isString(program.value)) {
    return (output.fail(`A value to be written at the given address is expected.`));
  }
  if (isNaN(parseInt(program.value, 10))) {
    return (output.fail(`An integer value is expected.`));
  }
  next();
});

/**
 * Injecting the connection routines into the `chain`.
 */
chain.use(require('./lib/middlewares/connection-routines'));

/**
 * Writing the register
 */
chain.use((input, output) => {
  const addr  = parseInt(program.address, 10);
  const value = parseInt(program.value, 10);
  
  // Writing the value.
  input.client.writeSingleRegister(addr, value).then(() => {
    signale.success(`Successfully wrote value '${value}' at address '${addr}'.`);
    // Closing the socket.
    input.socket.destroy();
  }).catch(output.fail);
});

// Triggering the `chain`.
chain.handle({}, {});