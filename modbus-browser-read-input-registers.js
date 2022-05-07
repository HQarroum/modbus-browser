const _       = require('lodash');
const program = require('commander');
const hexdump = require('hexdump-nodejs');
const Chain   = require('middleware-chain-js');
const chalk   = require('chalk');

// Instanciating the middleware chain.
const chain = new Chain();

/**
 * Command-line interface.
 */
program
  .name('modbus-browser read-input-registers')
  .description('Reads the value of the input registers between the given start and end addresses.')
  .option('-s, --server <hostname>', 'The hostname or IP address of the Modbus server to initiate a connection to.')
  .option('-p, --port <port>', 'The port of the Modbus server to initiate a connection to (set to `502` by default).')
  .option('-u, --unit-id <unitId>', 'The unit identifier to perform the action on (set to `1` by default).')
  .option('-a, --start-address <address>', 'The start address of the input registers to be read.')
  .option('-c, --count <count>', 'The amount of coils to be read.')
  .option('-m, --monitor', 'Causes the `mobus-browser` to continuously monitor the input registers at the given address.')
  .option('-i, --interval <interval>', 'Specifies the interval in milliseconds at which `mobus-browser` is continuously dumping the input registers values when monitoring is enabled.')
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
  if (!_.isString(program.startAddress) || !_.isString(program.count)) {
    return (output.fail(`The start address and the count options must be valid numbers.`));
  }
  if (_.isString(program.unitId) && isNaN(parseInt(program.unitId))) {
    return (output.fail(`The unit identifier must be a valid number.`));
  }
  next();
});

/**
 * Injecting the connection routines into the `chain`.
 */
chain.use(require('./lib/middlewares/connection-routines'));

/**
 * Reading the discrete inputs
 */
chain.use((input, output) => {
  const intervalFn = program.monitor ? setInterval : setTimeout;
  const interval   = program.monitor ? (program.interval || 2000) : 0;

  // Reading the discrete inputs between the given addresses.
  intervalFn(() => {
    input.client.readInputRegisters(
      parseInt(program.startAddress),
      parseInt(program.count)
    ).then((res) => {
      // Dumping the date at which the response was received.
      console.log(`Received at : ${chalk.underline.white.bold(res.metrics.receivedAt)}`);
      // Dumping the hexdump of the values.
      console.log(`\n${hexdump(res.response._body._valuesAsBuffer)}\n`);
      if (!program.monitor) {
        // Closing the socket.
        input.socket.destroy();
      }
    }).catch(output.fail);
  }, interval);
});

// Triggering the `chain`.
chain.handle({}, {});