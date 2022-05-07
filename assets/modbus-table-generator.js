const program = require('commander');

/**
 * Command-line interface.
 */
program
  .name('modbus-table-generator')
  .description('Creates register tables along with their associated addresses for the `modbus-browser` dashboard.')
  .option('-s, --start-address <start-address>', 'The start address of the table.')
  .option('-e, --end-address <end-address>', 'The end address of the table.')
  .option('-c, --count <count>', 'The number between each address windows.')
  .option('-t, --type <type>', 'The type of the register (e.g `coil`, `discrete-input`, etc.).')
  .parse(process.argv);

/**
 * Verifying that the passed options are valid.
 */
[program.startAddress, program.endAddress, program.count, program.type].forEach((o) => {
  if (typeof o === 'undefined') {
    program.outputHelp();
    process.exit(1);
  }
});

const start = parseInt(program.startAddress);
const end   = parseInt(program.endAddress);
let length  = parseInt(program.count);
const type  = program.type;
const obj   = {};

for (let idx = start; idx < end; idx += length) {
  let address = idx;
  let high    = idx + length;
  if (high > end) {
    length = length - (high - end);
    high = end;
  }
  obj[`${address}-${high}`] = { address, length, type };
}

console.log(JSON.stringify(obj));