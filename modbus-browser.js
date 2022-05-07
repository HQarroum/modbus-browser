#!/usr/bin/env node

const _       = require('lodash');
const program = require('commander');

// Retrieving package informations.
const { version, description } = require('./package.json');

/**
 * Command-line interface.
 */
program
  .version(version)
  .name('modbus-browser')
  .description(description)
  .command('read-coils', 'Reads the value of the coils between the given start and end addresses.')
  .command('read-discrete-inputs', 'Reads the value of the discrete inputs between the given start and end addresses.')
  .command('read-holding-registers', 'Reads the value of the holding registers between the given start and end addresses.')
  .command('read-input-registers', 'Reads the value of the input registers between the given start and end addresses.')
  .command('write-single-coil', 'Writes the given value associated with the coil stored at the given address.')
  .command('write-single-register', 'Writes the given value associated with the register stored at the given address.')
  .command('write-coils', 'Writes the given values of multiple coils at the given address.')
  .command('dashboard', 'Opens an interactive browser in your terminal allowing you to browse values associated with different Modbus registers.')
  .parse(process.argv);

// Error handling.
if (!_.find(program.commands, (cmd) => cmd.name() === program.args[0])) {
  program.outputHelp();
  process.exit(-1);
}