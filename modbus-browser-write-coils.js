const _       = require('lodash');
const program = require('commander');
const signale = require('signale');
const Chain   = require('middleware-chain-js');
const bitwise = require('bitwise');

// Instanciating the middleware chain.
const chain = new Chain();

/**
 * @return a buffer given a list of binary integer
 * comma delimited list.
 * @param {*} bits a comma delimited list of binary integers.
 */
const getBitsBuffer = (bits) => {
  let array = bits.split(',');

  if (array.length < 1 || array[0] === '') {
    throw new Error(`At least one value should be provided.`);
  }
  if (array.filter((v) => (v !== '0' && v !== '1') || v === '').length > 0) {
    throw new Error(`A boolean value is expected for each coil value (e.g '0,1,1,0,0,1').`);
  }
  const size = array.length;
  array = array.map((b) => parseInt(b, 10));
  return ([bitwise.buffer.create(array), size]);
};

/**
 * @return a buffer given a list of bytes comma delimited list
 * @param {*} bytes a comma delimited list of bytes.
 */
const getBytesBuffer = (bytes) => {
  let array = bytes.split(',');

  if (array.length < 1 || array[0] === '') {
    throw new Error(`At least one value should be provided.`);
  }
  array = Buffer.from(array);
  return ([array, array.length * 8]);
};

/**
 * Command-line interface.
 */
program
  .name('modbus-browser write-coils')
  .description('Writes the given values of multiple coils at the given address.')
  .option('-s, --server <hostname>', 'The hostname or IP address of the Modbus server to initiate a connection to.')
  .option('-p, --port <port>', 'The port of the Modbus server to initiate a connection to (set to `502` by default).')
  .option('-u, --unit-id <unitId>', 'The unit identifier to perform the action on (set to `1` by default).')
  .option('-a, --start-address <address>', 'The start address at which the given values should be written.')
  .option('-b, --bits <bits>', 'A comma delimited list of bits to associate with coils to be written (e.g `0,1,0,1,1,0,1,0,0`).')
  .option('-y, --bytes <bytes>', 'A comma delimited list of bytes to associate with coils to be written (e.g `0xff,0x00,0xfe,0x00`).')
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
  if (!_.isString(program.startAddress)) {
    return (output.fail(`The address at which the value must be written should be a valid number.`));
  }
  if (_.isString(program.unitId) && isNaN(parseInt(program.unitId, 10))) {
    return (output.fail(`The unit identifier must be a valid number.`));
  }
  if (!_.isString(program.bits) && !_.isString(program.bytes)) {
    return (output.fail(`A value to be written at the given address is expected. Provide either a '--bits' or a '--bytes' option.`));
  }
  if (_.isString(program.bits) && _.isString(program.bytes)) {
    return (output.fail(`Provide either a '--bits' or a '--bytes' option.`));
  }
  const unit = _.isString(program.bits) ? 'bits' : 'bytes';
  try {
    if (unit === 'bits') {
      // Transforming the given bit values in a buffer.
      [input.buffer, input.size] = getBitsBuffer(program.bits);
    } else if (unit === 'bytes') {
      // Transforming the given byte values in a buffer.
      [input.buffer, input.size] = getBytesBuffer(program.bytes);
    }
  } catch (e) {
    return (output.fail(e));
  }
  next();
});

/**
 * Injecting the connection routines into the `chain`.
 */
chain.use(require('./lib/middlewares/connection-routines'));

/**
 * Reading the coils
 */
chain.use((input, output) => {
  const addr = parseInt(program.startAddress, 10);
  
  // Writing the value.
  input.client.writeMultipleCoils(addr, input.buffer, input.size).then(() => {
    signale.success(`Successfully wrote '${input.buffer.length}' bytes at address '${addr}'.`);
    // Closing the socket.
    input.socket.destroy();
  }).catch(output.fail);
});

// Triggering the `chain`.
chain.handle({}, {});