/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
/* jshint -W061 */
'use strict';
//const http = require('http');

/**
 * Proxy class
 *
 * Read files from localhost server
 *
 * @class
 * @param {object} server http or https node.js object
 * @param {object} webSettings settings of the web server, like <pre><code>{secure: settings.secure, port: settings.port}</code></pre>
 * @param {object} adapter web adapter object
 * @param {object} instanceSettings instance object with common and native
 * @param {object} app express application
 * @return {object} object instance
 */
class ExtensionExample {
    constructor(server, webSettings, adapter, instanceSettings, app) {
        this.app       = app;
        this.config    = instanceSettings ? instanceSettings.native : {};
        this.namespace = instanceSettings ? instanceSettings._id.substring('system.adapter.'.length) : 'flexcharts';

        const route = 'flexcharts';

        this.adapter = adapter;

        this.adapter.log.info(`Install extension on /${route}`);

        this.app.use(`/${route}`, (req, res) => {
                res.setHeader('Content-type', 'text/html');
                res.status(200).send('You called a demo web extension with path "' + req.url + '"');
            }
        );
    }
}

module.exports = ExtensionExample;