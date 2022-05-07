const program = require('commander');
const info    = require('./package.json');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chalk   = require('chalk');
const signale = require('signale');
const Chain   = require('middleware-chain-js');
const hexdump = require('hexdump-nodejs');

// Loading the address tables.
const coils            = require('./lib/tables/coils-table');
const holdingRegisters = require('./lib/tables/holding-registers-table');
const discreteInputs   = require('./lib/tables/discrete-inputs-table');
const inputRegisters   = require('./lib/tables/input-registers-table');

// Instanciating the middleware chain.
const chain = new Chain();

// The monitoring interval handle.
let handle = null;

// The default refresh timeout.
const timeout = 5 * 1000;

/**
 * Command-line interface.
 */
program
  .name('modbus-browser dashboard')
  .description('Opens an interactive browser in your terminal allowing you to browse values associated with different Modbus registers.')
  .option('-s, --server <hostname>', 'The hostname or IP address of the Modbus server to initiate a connection to.')
  .option('-p, --port <port>', 'The port of the Modbus server to initiate a connection to (set to `502` by default).')
  .option('-u, --unit-id <unitId>', 'The unit identifier to perform the action on (set to `1` by default).')
  .parse(process.argv);

/**
 * Causes the hexdump view to be cleared.
 */
const clearDataView = function () {
  // Clearing existing items on the `hexdump` view.
  //this.hexdump.clearItems();
  // Re-creating the `hexdump` view.
  this.hexdump = createHexdump(this.grid);
  // Clearing existing items on the `hexdump` view.
  //this.attrList.clearItems();
  // Re-creating the `attrList` view.
  this.attrList = createAttributeList(this.grid);
  // Refreshing the screen.
  this.screen.render();
};

/**
 * A generic browse function that takes the type of node to browse
 * and the node attributes and diplays the result.
 * @param {*} node the node that has been selected.
 * @param {*} opts an options object.
 */
const browse = function (node, opts = { refresh: true }) {
  if (opts.refresh) {
    clearDataView.call(this);
  }
  // Logging the reading operation.
  this.logger.log(`[+] Reading '${node.length}' ${opts.unit} at address '${node.address}' ...`);
  // Triggering the reading.
  this.client[opts.method](node.address, node.length).then((res) => {
    // The data to dump.
    this.attrList.log(`${chalk.bold('Address')}......................................: ${node.address}`);
    this.attrList.log(`${chalk.bold('Type')}.........................................: ${opts.type}`);
    this.attrList.log(`${chalk.bold('Size read')}....................................: ${node.length} ${opts.unit}`);
    this.attrList.log(`${chalk.bold('Unit identifier')}..............................: ${this.unitId}`);
    this.attrList.log(`${chalk.bold('Requested at')}.................................: ${res.metrics.createdAt}`);
    this.attrList.log(`${chalk.bold('Received at')}..................................: ${res.metrics.receivedAt}`);
    const data = `\n${hexdump(opts.resolver(res))}`;
    // For each line we display it in the `hexdump` view.
    data.split('\n').forEach((d) => this.hexdump.log(d));
    this.logger.log(`[+] Successfully read '${node.length}' ${opts.unit} at address '${node.address}' ...`);
    // Refreshing the screen.
    this.screen.render();
  }).catch((err) => {
    // Logging the error.
    this.logger.log(`[!] Caught error : ${err.toString()}`);
    this.screen.render();
  });
};

/**
 * Browsing the selected coils.
 * @param {*} node the node that has been selected.
 * @param {*} opts an options object.
 */
const browseCoil = function (node, opts) {
  return (browse.call(this, node, {
    method: 'readCoils',
    type: 'Coils',
    unit: 'Bits',
    resolver: (res) => res.response._body._coils,
    ...opts
  }));
};

/**
 * Browsing the selected holding registers.
 * @param {*} node the node that has been selected.
 * @param {*} opts an options object.
 */
const browseHoldingRegister = function (node, opts) {
  return (browse.call(this, node, {
    method: 'readHoldingRegisters',
    type: 'Holding Registers',
    unit: 'Bytes',
    resolver: (res) => res.response._body._valuesAsBuffer,
    ...opts
  }));
};

/**
 * Browsing the selected discrete inputs.
 * @param {*} node the node that has been selected.
 * @param {*} opts an options object.
 */
const browseDiscreteInput = function (node, opts) {
  return (browse.call(this, node, {
    method: 'readDiscreteInputs',
    type: 'Discrete Inputs',
    unit: 'Bits',
    resolver: (res) => res.response._body._discrete,
    ...opts
  }));
};

/**
 * Browsing the selected input registers.
 * @param {*} node the node that has been selected.
 * @param {*} opts an options object.
 */
const browseInputRegister = function (node, opts) {
  return (browse.call(this, node, {
    method: 'readInputRegisters',
    type: 'Input Registers',
    unit: 'Bytes',
    resolver: (res) => res.response._body._valuesAsBuffer,
    ...opts
  }));
};

/**
 * Called back when a node is selected in the tree.
 * @param {*} node a reference to the node that was selected.
 */
const onNodeSelected = function (node) {
  clearTimeout(handle);
  clearDataView.call(this);
  if (node.type === 'coil') {
    browseCoil.call(this, node);
    handle = setInterval(() => browseCoil.call(this, node, { refresh: true }), timeout);
  } else if (node.type === 'discrete-input') {
    browseDiscreteInput.call(this, node);
    handle = setInterval(() => browseDiscreteInput.call(this, node, { refresh: true }), timeout);
  } else if (node.type === 'holding-register') {
    browseHoldingRegister.call(this, node);
    handle = setInterval(() => browseHoldingRegister.call(this, node, { refresh: true }), timeout);
  } else if (node.type === 'input-register') {
    browseInputRegister.call(this, node);
    handle = setInterval(() => browseInputRegister.call(this, node, { refresh: true }), timeout);
  }
};

/**
 * Creates the browser view.
 * @return a reference to the browser view.
 * @param {*} grid the grid to add the browser view on.
 */
const createBrowser = (grid) => {
  const browser = grid.set(0, 0, 7, 6, contrib.tree, {
    showNthLabel: 5,
    maxY: 600,
    label: 'Modbus Browser',
    showLegend: true,
    legend: { width: 12 }
  });
  // Setting the data tables associated with each register type.
  browser.setData({
    extended: true,
    children: {
      'Coils': { children: coils },
      'Discrete Inputs': { children: discreteInputs },
      'Holding Registers': { children: holdingRegisters },
      'Input Registers': { children: inputRegisters }
    }});
  return (browser);
};

/**
 * Creates the dashboard menu bar view.
 * @return a reference to the menu bar view.
 * @param {*} grid the grid to add the menu bar view on.
 */
const createMenuBar = function () {
  // Creating a regular list bar using `blessed` directly.
  const menuBar = blessed.listbar({
    top: '100%-2',
    left: 'left',
    width: '100%',
    height: 2,
    keys: true,
    bg: 'black',
    autoCommandKeys: true
  });
  // Manually appending the list bar to the screen.
  this.screen.append(menuBar);
  // Specifying the items of the menu bar.
  menuBar.setItems({
      'Exit': {
          keys: ['Escape or q']
      },
      'Clear': {
          keys: ['c'],
          callback: () => {
              this.logger.clearItems();
              this.screen.render();
          }
      },
      'Select Node': {
        keys: ['Space or Enter']
      }
  });
  return (menuBar);
};

/**
 * Creates the logger view.
 * @return a reference to the logger view.
 * @param {*} grid the grid to add the logger view on.
 */
const createLogger = (grid) => grid.set(7, 0, 4, 12, contrib.log, { label: 'Browser Log' });

/**
 * Creates the attribute list view.
 * @return a reference to the hexdump view.
 * @param {*} grid the grid to add the hexdump view on.
 */
const createAttributeList = (grid) => grid.set(0, 6, 3, 6, contrib.log, { label: 'Attribute List' });

/**
 * Creates the hexdump view.
 * @return a reference to the hexdump view.
 * @param {*} grid the grid to add the hexdump view on.
 */
const createHexdump = (grid) => grid.set(3, 6, 4, 6, contrib.log, { label: 'Hexdump View' });

/**
 * @param {*} value the value to check the type of.
 * @returns whether the value is a string.
 */
const isString = (value) => (typeof value === 'string' || value instanceof String);

/**
 * Injecting the initialization routines into the `chain`.
 */
chain.use(require('./lib/middlewares/initialization-routines'));

/**
 * Verifying that the given arguments are valid.
 */
chain.use((_, output, next) => {
  if (!isString(program.server)) {
    return (output.fail(`The hostname or IP address of the Modbus server to connect to is expected.`));
  }
  if (isString(program.unitId) && isNaN(parseInt(program.unitId))) {
    return (output.fail(`The unit identifier must be a valid number.`));
  }
  next();
});

/**
 * Injecting the connection routines into the `chain`.
 */
chain.use(require('./lib/middlewares/connection-routines'));

/**
 * Creating widgets.
 */
chain.use((input, _, next) => {
  // Creating a new screen instance.
  input.screen = blessed.screen();
  // Creating a new grid on the screen.
  input.grid = new contrib.grid({ rows: 12, cols: 12, screen: input.screen });
  // Creating a new browser widget.
  input.browser = createBrowser(input.grid);
  // Creating a new logger widget.
  input.logger = createLogger(input.grid);
  // Creating a new menu bar widget.
  input.menuBar = createMenuBar.call(input);
  // Creating a new attribute list widget.
  input.attrList = createAttributeList(input.grid);
  // Creating a new hexdump widget.
  input.hexdump = createHexdump(input.grid);
  input.browser.focus();
  input.browser.on('select', onNodeSelected.bind(input));
  // Adding initial logs.
  input.logger.log(`Welcome to the ${chalk.underline.bold(`Modbus Browser v${info.version}`)} !`);
  input.logger.log(`[+] You are connected to the Modbus Browser ${program.server}:${input.port}.`);
  // Rendering the screen.
  input.screen.render();
  next();
});

/**
 * Installing handlers.
 */
chain.use((input) => {
  // Quitting the application on defined key events.
  input.screen.key(['escape', 'q'], () => process.kill(process.pid, 'SIGTERM'));
  // Attaching on a `resize` event.
  input.screen.on('resize', () => {
    input.browser.emit('attach');
    input.menuBar.emit('attach');
    input.hexdump.emit('attach');
    input.logger.emit('attach');
  });
  // Instanlling handlers for terminal signals to gracefully
  // exit the application.
  ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => {
      // Destrying the screen.
      input.screen.destroy();
      // Logging that we are quitting the application.
      signale.pending('Closing the dashboard ...');
      // Closing the client.
      process.exit(0);
    })
  });
});

// Triggering the `chain`.
chain.handle({}, {});