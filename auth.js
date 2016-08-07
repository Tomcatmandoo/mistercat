const defaults = require('lodash.defaults');
const pass = require('pass');
const path = require('path');

/**
 * Expose `plugin`
 */

module.exports = plugin;

/**
 * Metalsmith plugin to enable HTTP basic
 * authentication via YAML attributes.
 *
 * @param  {Object} opts
 * @return {Function}
 */
function plugin (opts) {

    opts = defaults(opts || {}, {
        authName: 'Protected Area'
    });

     /**
      * Plugin function
      *
      * @param  {Object}   files
      * @param  {Object}   metalsmith
      * @param  {Function} done
      */
    return function (files, metalsmith, done) {
        var file;

        // Require `serverPath` setting
        if (!opts.hasOwnProperty('serverPath') || opts.serverPath.length < 1) done('serverPath setting is required');

        // Require the username and PASSWORD
        var hasPassword = opts.hasOwnProperty('username') && opts.username.length > 0 && opts.hasOwnProperty('password') && opts.password.length > 0;

        // Gather information on files with auth attributes
        for (file in files) {
            if (files[file].auth && hasPassword) {
                addAuthFiles(files, file, files[file]);
            }
        }

        done();
    };

    /**
     * Add .htaccess and .htpasswd files next to the file
     *
     * @param {Object} files
     * @param {String} filepath
     * @param {Object} file
     */
    function addAuthFiles (files, filepath, file) {
        var htaccess = 'AuthType Basic\nAuthName "' + opts.authName + '"\nAuthUserFile ' + path.join(opts.serverPath, path.dirname(filepath)) + '/.htpasswd\nRequire valid-user';
        var htpasswd = opts.username + ':';

        // Generate encrypted password
        pass.generate(opts.password, function (err, hash) {
            if (err) console.log(err);
            htpasswd += hash;
        });

        // Add .htaccess file to files object
        files[path.join(path.dirname(filepath), '.htaccess')] = { contents: htaccess };

        // Add .htpasswd file to files object
        files[path.join(path.dirname(filepath), '.htpasswd')] = { contents: htpasswd };
    }
}
