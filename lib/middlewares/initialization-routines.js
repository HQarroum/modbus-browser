const signale = require('signale');
const updates = require('update-notifier');

/**
 * Exits the application with the given `err` message.
 * @param {*} err the error message to display.
 */
const fail = (err) => {
  signale.fatal(err);
  process.exit(1);
};

/**
 * Exporting the initialization routines, ensuring
 * that the environment is properly configured.
 */
module.exports = [

  /**
   * Registers `outputs`.
   */
  (_, output, next) => {
    next(output.fail = fail);
  },

  /**
   * Verifies whether a new version of the `green-cli` is available.
   */
  (_1, _2, next) => {
    const pkg = require('../../package.json');
    try {
      // Checks for updates once a day.
      updates({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 }).notify();
    } catch (e) {
      // The update checker can fail if the filesystem is read-only.
      signale.warn(e);
    }
    next();
  }
];