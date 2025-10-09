/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
/* jshint -W061 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Proxy class
 *
 * Implement functionality to evaluate and forward users definition of diagram to eChart-script
 *
 */
class ExtensionFlexcharts {
    /**
     * @param {object} server http or https node.js object
     * @param {object} webSettings settings of the web server, like <pre><code>{secure: settings.secure, port: settings.port}</code></pre>
     * @param {object} adapter web adapter object
     * @param {object} instanceSettings instance object with common and native
     * @param {object} app express application
     */
    constructor(server, webSettings, adapter, instanceSettings, app) {
        this.app = app;
        this.config = instanceSettings ? instanceSettings.native : {};
        this.namespace = instanceSettings ? instanceSettings._id.substring('system.adapter.'.length) : 'flexcharts.0';
        this.name = this.namespace.split('.')[0];
        this.pd = String(os.platform) == 'win32' ? '\\' : '/'; // Path delimiter
        this.path = __dirname
            .replace(`/.dev-server/default/node_modules/iobroker.${this.name}`, '')
            .replace(`${this.pd}lib`, '');
        this.rxChart = /\{ \/\* chartOptions \*\/ \}/; // Regular Expression to replace '{ /* chartOptions */ }' in echarts.html
        this.rxUserFct = /\/\* userFunctions\(\) \*\//; // Regular Expression to replace '/* userFunctions() */' in echarts.html
        this.rxUserFctPlain = '/* userFunctions() */'; // Plain version of replacement text in echarts.html
        this.rxDMdefault = /myDarkMode = 'default'/; // Regular Expression to switch darkmode in echarts.html to update according to system setting
        this.strDMdark = "myDarkMode = 'dark'"; // Replacement for above RegEx to activate dark mode permanently
        this.strDMauto = "myDarkMode = 'auto'"; // Replacement for above RegEx to activate dynamic switching
        this.rxRefresh = /http-equiv="refresh" content="-3600"/; // Regular Expression to add refresh value in echarts.html
        this.strRefresh = 'http-equiv="refresh" content="'; // Replacement for above RegEx

        this.adapter = adapter;

        this.adapter.log.info(`Install extension on /${this.name}`);

        this.app.use(`/${this.name}`, (req, res) => {
            //res.setHeader('Content-type', 'text/html');
            //res.status(200).send('You called a demo web extension with path "' + req.url + '"');
            this.eCharts(req, res);
        });

        // Tools to select MIME-type based on file extension
        const getMimeType = filePath => {
            const extname = path.extname(filePath);
            switch (extname) {
                case '.html':
                    return 'text/html';
                case '.js':
                    return 'application/javascript';
                case '.css':
                    return 'text/css';
                case '.json':
                    return 'application/json';
                case '.png':
                    return 'image/png';
                case '.jpg':
                    return 'image/jpg';
                case '.gif':
                    return 'image/gif';
                case '.svg':
                    return 'image/svg+xml';
                default:
                    return 'application/octet-stream';
            }
        };

        this.applyDarkmode = function (content, queryDM) {
            if (queryDM == 'on') {
                // Switch to dark mode permanently
                content = new Buffer(content.toString().replace(this.rxDMdefault, this.strDMdark));
            }
            if (queryDM == 'auto') {
                // Align dark mode to system setting
                content = new Buffer(content.toString().replace(this.rxDMdefault, this.strDMauto));
            }
            return content;
        };

        /**
         * @param {object} content html content
         * @param {Array} themeDef Definition of theme: [definition, name]
         */
        this.applyTheme = function (content, themeDef) {
            if (typeof themeDef[0] == 'string' && typeof themeDef[1] == 'string') {
                const r = themeDef[0].replaceAll(/\$/g, '$$$$'); // Mask '$' (by replacing it with $$) to avoid evaluation in following replacement action
                const themeName = themeDef[1];
                if (r.length > 0) {
                    if (r.includes('registerTheme')) {
                        // Full definition and registration of theme received
                        content = new Buffer(content.toString().replace(this.rxUserFct, r + this.rxUserFctPlain));
                    } else {
                        // JSON object of parameters of theme received
                        const f = `echarts.registerTheme("${themeName}",${r});`; // Function to register theme
                        content = new Buffer(content.toString().replace(this.rxUserFct, f + this.rxUserFctPlain));
                    }
                }
            }
            return content;
        };

        this.eCharts = async function (req, res) {
            //this.adapter.log.debug(`Default file path: ${fs.realpathSync('./')}`);
            this.adapter.log.debug(`Request for ${req.url}`);

            const parts = (req.url || '').split('?');
            const url = parts[0].replace('/', this.pd);
            const query = {};
            var queryDM = 'off'; // Query for dark mode ('off', 'on' or 'auto'). 'auto' => Using system setting. Defaults ot 'off'.

            (parts[1] || '').split('&').forEach(p => {
                const pp = p.split('=');
                if (pp[0]) {
                    query[pp[0]] = decodeURIComponent(pp[1] || '');
                }
            });

            if (String(query.refresh) == '') {
                query.refresh = 60;
            } // Default value
            if (query.refresh && query.refresh >= 0 && query.refresh < 5) {
                query.refresh = 5;
            } // Minumum value

            // Evaluate query for dark mode. Maintain backward compatibility, i.e. apply dark mode if parameter "darkmode" ist given w/o a value.
            if ('darkmode' in query) {
                switch (String(query.darkmode)) {
                    case 'off':
                        queryDM = 'off';
                        break;
                    case '':
                        queryDM = 'on';
                        break;
                    case 'on':
                        queryDM = 'on';
                        break;
                    case 'auto':
                        queryDM = 'auto';
                        break;
                    default:
                        queryDM = 'off';
                }
            }

            // Extrect path of file from provided URL
            let filePath = `${this.path + this.pd}www${url}`;
            this.adapter.log.debug(`filePath = ${filePath}`);
            this.adapter.log.debug(`query    = ${JSON.stringify(query)}`);

            // Select MIME-type
            const contentType = getMimeType(filePath);

            // Read file
            fs.readFile(filePath, (error, content) => {
                //this.log.debug(`content = ${content}`);
                if (error) {
                    if (error.code == 'ENOENT') {
                        // File not found
                        this.adapter.log.debug(`File not found!`);
                        fs.readFile(`${this.path + this.pd}www${this.pd}404.html`, (error404, content404) => {
                            this.adapter.log.debug(`View 404-page ...`);
                            this.adapter.log.debug(JSON.stringify(error404));
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end(content404, 'utf-8');
                        });
                    } else {
                        // Unknown error
                        res.writeHead(500);
                        res.end(`Server Error: ${error.code}`);
                    }
                } else {
                    // File found, send content
                    if (req.url && req.url.includes('echarts.html')) {
                        if (query.source) {
                            switch (query.source) {
                                case 'script':
                                    var message = 'flexcharts';
                                    if (query.message) {
                                        message = query.message;
                                    }
                                    this.adapter.sendTo(
                                        'javascript.0',
                                        'toScript',
                                        { message: message, data: query },
                                        result => {
                                            if (result.error) {
                                                // Callback returned an error => show a demo chart
                                                this.adapter.log.debug(result.error);
                                                this.demoChart(result => {
                                                    res.writeHead(200, { 'Content-Type': contentType });
                                                    content = new Buffer(
                                                        content
                                                            .toString()
                                                            .replace(this.rxChart, JSON.stringify(result)),
                                                    );
                                                    content = this.applyDarkmode(content, queryDM);
                                                    res.end(content, 'utf-8');
                                                });
                                            } else {
                                                if (result && result == 'Error: Timeout exceeded') {
                                                    // sendTo timed out
                                                    res.writeHead(200, { 'Content-Type': contentType });
                                                    content = new Buffer(
                                                        'ERROR: Request to javascript.0 timed out! Is your script running? Is the "message" in onMessage() and html-request matching? Default-message is "flexcharts"',
                                                    );
                                                    res.end(content, 'utf-8');
                                                } else {
                                                    // Callback ok => analyze it's result
                                                    this.adapter.log.debug(result);
                                                    res.writeHead(200, { 'Content-Type': contentType });
                                                    if (query.refresh && query.refresh >= 5) {
                                                        content = new Buffer(
                                                            content
                                                                .toString()
                                                                .replace(
                                                                    this.rxRefresh,
                                                                    `${this.strRefresh + String(query.refresh)}"`,
                                                                ),
                                                        );
                                                    }
                                                    if (typeof result == 'string') {
                                                        // Script returned stringified chart options
                                                        // It's possible to include funtions by using javascript-stringify, see
                                                        // https://github.com/blakeembrey/javascript-stringify
                                                        const r = result.replaceAll(/\$/g, '$$$$'); // Mask '$' (by replacing it with $$) to avoid evaluation in following replacement action
                                                        content = new Buffer(
                                                            content.toString().replace(this.rxChart, r),
                                                        );
                                                    } else {
                                                        if (Array.isArray(result)) {
                                                            // Script returned an array => assumption: this is an array of strings containing up to 4 elements:
                                                            //   [0] => String formatted chart options
                                                            //   [1+] => if type string: String formatted definition of dynamic function(s)
                                                            //   [1+] => if type array: Definition of default theme: [definition, name] (optional)
                                                            if (result.length > 0 && typeof result[0] == 'string') {
                                                                // Process chart options
                                                                const r = result[0].replaceAll(/\$/g, '$$$$'); // Mask '$' (by replacing it with $$) to avoid evaluation in following replacement action
                                                                content = new Buffer(
                                                                    content.toString().replace(this.rxChart, r),
                                                                );
                                                            }
                                                            var i = 1;
                                                            while (i <= result.length) {
                                                                if (typeof result[i] == 'string') {
                                                                    // Process definition of dynamic functions
                                                                    const r = result[i].replaceAll(/\$/g, '$$$$'); // Mask '$' (by replacing it with $$) to avoid evaluation in following replacement action
                                                                    if (r.length > 0) {
                                                                        content = new Buffer(
                                                                            content
                                                                                .toString()
                                                                                .replace(
                                                                                    this.rxUserFct,
                                                                                    r + this.rxUserFctPlain,
                                                                                ),
                                                                        );
                                                                    }
                                                                }
                                                                if (Array.isArray(result[i]) && result[i].length == 2) {
                                                                    // Process definition of default theme ([definition, name])
                                                                    content = this.applyTheme(content, result[i]);
                                                                }
                                                                i += 1;
                                                            }
                                                        } else {
                                                            // Script returned chart options as JSON object.
                                                            // Use standard JSON.stringify() to convert it to a String
                                                            content = new Buffer(
                                                                content
                                                                    .toString()
                                                                    .replace(this.rxChart, JSON.stringify(result)),
                                                            );
                                                        }
                                                    }
                                                    content = this.applyDarkmode(content, queryDM);
                                                    res.end(content, 'utf-8');
                                                }
                                            }
                                        },
                                        { timeout: 2000 },
                                    );
                                    break;
                                case 'state':
                                    if (query.id) {
                                        this.adapter.getForeignState(query.id, (error, result) => {
                                            if (result && result.val) {
                                                this.adapter.log.debug(result.val);
                                                res.writeHead(200, { 'Content-Type': contentType });
                                                if (query.refresh && query.refresh >= 5) {
                                                    content = new Buffer(
                                                        content
                                                            .toString()
                                                            .replace(
                                                                this.rxRefresh,
                                                                `${this.strRefresh + String(query.refresh)}"`,
                                                            ),
                                                    );
                                                }
                                                if (typeof result.val == 'string') {
                                                    const r = result.val.replaceAll(/\$/g, '$$$$'); // Mask '$' (by replacing it with $$) to avoid evaluation in following replacement action
                                                    var rp = null;
                                                    try {
                                                        rp = JSON.parse(r);
                                                    } catch {
                                                        this.adapter.log.debug(
                                                            `Could not parse content of state ${
                                                                query.id
                                                            }. Using it's content as String.`,
                                                        );
                                                        rp = r;
                                                    }
                                                    if (Array.isArray(rp)) {
                                                        // Script contains an array => assumption: this is an array of strings containing two elements:
                                                        //   [0] => String formatted chart options
                                                        //   [1+] => if type string: String formatted definition of dynamic function(s)
                                                        //   [1+] => if type array: Definition of default theme: [definition, name] (optional)
                                                        this.adapter.log.debug(
                                                            `Content of state ${
                                                                query.id
                                                            } was parsed as Array. Assumption: Got Array of Strings.`,
                                                        );
                                                        if (rp.length > 0 && typeof rp[0] == 'string') {
                                                            content = new Buffer(
                                                                content.toString().replace(this.rxChart, rp[0]),
                                                            );
                                                        }
                                                        var i = 1;
                                                        while (i <= rp.length) {
                                                            if (typeof rp[i] == 'string') {
                                                                // Process definition of dynamic functions
                                                                content = new Buffer(
                                                                    content
                                                                        .toString()
                                                                        .replace(
                                                                            this.rxUserFct,
                                                                            rp[i] + this.rxUserFctPlain,
                                                                        ),
                                                                );
                                                            }
                                                            if (Array.isArray(rp[i]) && rp[i].length == 2) {
                                                                // Process definition of default theme ([definition, name])
                                                                content = this.applyTheme(content, rp[i]);
                                                            }
                                                            i += 1;
                                                        }
                                                    } else {
                                                        // State contains a String and must not be parsed => use content of r
                                                        content = new Buffer(
                                                            content.toString().replace(this.rxChart, r),
                                                        );
                                                    }
                                                } else {
                                                    // State contains a JSON object
                                                    content = new Buffer(
                                                        content
                                                            .toString()
                                                            .replace(this.rxChart, JSON.stringify(result.val)),
                                                    );
                                                }
                                                content = this.applyDarkmode(content, queryDM);
                                                res.end(content, 'utf-8');
                                            } else {
                                                res.writeHead(200, { 'Content-Type': contentType });
                                                content = new Buffer(`Could not read state id ${query.id}`);
                                                res.end(content, 'utf-8');
                                            }
                                        });
                                    }
                                    break;
                                default:
                                    this.demoChartGauge(result => {
                                        res.writeHead(200, { 'Content-Type': contentType });
                                        content = new Buffer(
                                            content.toString().replace(this.rxChart, JSON.stringify(result)),
                                        );
                                        content = this.applyDarkmode(content, queryDM);
                                        res.end(content, 'utf-8');
                                    });
                                    break;
                            }
                        } else {
                            this.demoChart(result => {
                                res.writeHead(200, { 'Content-Type': contentType });
                                content = new Buffer(content.toString().replace(this.rxChart, JSON.stringify(result)));
                                content = this.applyDarkmode(content, queryDM);
                                res.end(content, 'utf-8');
                            });
                        }
                    } else {
                        if (req.url /*&& ( (req.url.includes('index.html')) || (req.url == '/') )*/) {
                            this.demoChartGauge(result => {
                                res.writeHead(200, { 'Content-Type': contentType });
                                content = new Buffer(content.toString().replace(this.rxChart, JSON.stringify(result)));
                                content = this.applyDarkmode(content, queryDM);
                                res.end(content, 'utf-8');
                            });
                        } else {
                            res.writeHead(200, { 'Content-Type': contentType });
                            res.end(content, 'utf-8');
                        }
                    }
                }
            });
        };
        this.demoChartGauge = async function (callback) {
            const option = {
                series: [
                    {
                        type: 'gauge',
                        startAngle: 90,
                        endAngle: -270,
                        pointer: {
                            show: false,
                        },
                        progress: {
                            show: true,
                            overlap: false,
                            roundCap: true,
                            clip: false,
                            itemStyle: {
                                borderWidth: 1,
                                borderColor: '#464646',
                            },
                        },
                        axisLine: {
                            lineStyle: {
                                width: 40,
                            },
                        },
                        splitLine: {
                            show: false,
                            distance: 0,
                            length: 10,
                        },
                        axisTick: {
                            show: false,
                        },
                        axisLabel: {
                            show: false,
                            distance: 50,
                        },
                        data: [
                            {
                                value: 20,
                                name: 'Perfect',
                                title: {
                                    offsetCenter: ['0%', '-30%'],
                                },
                                detail: {
                                    valueAnimation: true,
                                    offsetCenter: ['0%', '-20%'],
                                },
                            },
                            {
                                value: 40,
                                name: 'Good',
                                title: {
                                    offsetCenter: ['0%', '0%'],
                                },
                                detail: {
                                    valueAnimation: true,
                                    offsetCenter: ['0%', '10%'],
                                },
                            },
                            {
                                value: 60,
                                name: 'Commonly',
                                title: {
                                    offsetCenter: ['0%', '30%'],
                                },
                                detail: {
                                    valueAnimation: true,
                                    offsetCenter: ['0%', '40%'],
                                },
                            },
                        ],
                        title: {
                            text: 'Unknown Chart Type ==> Demo Chart: Gauge',
                            fontSize: 14,
                        },
                        detail: {
                            width: 50,
                            height: 14,
                            fontSize: 14,
                            color: 'inherit',
                            borderColor: 'inherit',
                            borderRadius: 20,
                            borderWidth: 1,
                            formatter: '{value}%',
                        },
                    },
                ],
            };
            callback(option);
        };

        this.demoChart = async function (callback) {
            const data = [];
            for (let i = 0; i <= 100; i++) {
                let theta = (i / 100) * 360;
                let r = 5 * (1 + Math.sin((theta / 180) * Math.PI));
                data.push([r, theta]);
            }
            const option = {
                title: {
                    text: 'Unknown Chart Type ==> Demo Chart: Two Value-Axes in Polar',
                },
                legend: {
                    data: ['line'],
                },
                polar: {},
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross',
                    },
                },
                angleAxis: {
                    type: 'value',
                    startAngle: 0,
                },
                radiusAxis: {},
                series: [
                    {
                        coordinateSystem: 'polar',
                        name: 'line',
                        type: 'line',
                        data: data,
                    },
                ],
            };
            callback(option);
        };
    }
}

module.exports = ExtensionFlexcharts;
