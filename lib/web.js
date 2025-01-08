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

class ExtensionFlexcharts {
    constructor(server, webSettings, adapter, instanceSettings, app) {
        this.app       = app;
        this.config    = instanceSettings ? instanceSettings.native : {};
        this.namespace = instanceSettings ? instanceSettings._id.substring('system.adapter.'.length) : 'flexcharts.0';
        this.name      = this.namespace.split('.')[0];
        this.pd        = ((String(os.platform) == 'win32') ? '\\' : '/');   // Path delimiter
        this.path      = __dirname.replace('/.dev-server/default/node_modules/iobroker.'+this.name,'').replace(this.pd+'lib','');
        this.placeholderStr = '{ solution: 42 }';

        this.adapter = adapter;

        this.adapter.log.info(`Install extension on /${this.name}`);

        this.app.use(`/${this.name}`, (req, res) => {
                //res.setHeader('Content-type', 'text/html');
                //res.status(200).send('You called a demo web extension with path "' + req.url + '"');
                this.eCharts(req, res);
            }
        );
 
        // Tools to select MIME-type based on file extension
      const getMimeType = (filePath) => {
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

      const replaceResultStr = (contentStr, result) => {
        // Replace place holder value with chart definition string
        const posOptions = contentStr.search(this.placeholderStr);
        contentStr = contentStr.substring(0, posOptions) + 
                     result +
                     contentStr.substring(posOptions+this.placeholderStr.length,contentStr.length);
        return contentStr;
      };

      this.eCharts = async function (req, res) {
        //this.adapter.log.debug(`Default file path: ${fs.realpathSync('./')}`);
        this.adapter.log.debug(`Request for ${req.url}`);

        const parts = (req.url || '').split('?');
        const url = parts[0].replace('/',this.pd);
        const query = {};
        (parts[1] || '').split('&').forEach(p => {
          const pp = p.split('=');
          if (pp[0]) query[pp[0]] = decodeURIComponent(pp[1] || '');
        });

        if (String(query.refresh) == '') query.refresh = 60;  // Default value
        if ( (query.refresh) && (query.refresh >= 0) && (query.refresh < 5) ) query.refresh = 5;  // Minumum value

        // Extrect path of file from provided URL
        let filePath = this.path+this.pd+'www' + url;
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
              fs.readFile(this.path+this.pd+'www'+this.pd+'404.html', (error404, content404) => {
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
            if ( (req.url) && (req.url.includes('echarts.html'))) {
              if (query.source) {
                switch (query.source) {
                  case 'script':
                    let message = 'flexcharts';
                    if (query.message) { message = query.message; }
                    this.adapter.sendTo('javascript.0', 'toScript', {
                      message: message,
                      data: query
                      },
                      result => {
                        // @ts-ignore
                        if (result.error) {
                          // @ts-ignore
                          this.log.debug(result.error);
                          this.demoChart(result => {
                            res.writeHead(200, { 'Content-Type': contentType });
                            content = new Buffer(content.toString().replace(this.placeholderStr,JSON.stringify(result)));
                            if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                            res.end(content, 'utf-8');
                          });
                        } else {
                          res.writeHead(200, { 'Content-Type': contentType });
                          if ( (query.refresh) && (query.refresh >= 5) ) content = new Buffer(content.toString().replace('http-equiv="refresh" content="-3600"','http-equiv="refresh" content="'+String(query.refresh)+'"'));
                          if (typeof result == 'string') {
                            // Script returned stringified chart options
                            // It's possible to include funtions by using javascript-stringify, see
                            // https://github.com/blakeembrey/javascript-stringify
                            content = new Buffer(replaceResultStr(content.toString(), result));
                          } else {
                            // Script returned chart options as JSON object,
                            // since sendTo()/callback converts a Javascript object to a JSON object
                            // which cannot contain function definitions
                            content = new Buffer(replaceResultStr(content.toString(), JSON.stringify(result)));
                          }
                          if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                          res.end(content, 'utf-8');
                        }
                      }	
                    );
                    break;
                  case 'state':
                    if (query.id) {
                      this.adapter.getForeignState(query.id, (error, result) => {
                        if ( (result) && (result.val) ) {
                          res.writeHead(200, { 'Content-Type': contentType });
                          if ( (query.refresh) && (query.refresh >= 5) ) content = new Buffer(content.toString().replace('http-equiv="refresh" content="-3600"','http-equiv="refresh" content="'+String(query.refresh)+'"'));
                          content = new Buffer(replaceResultStr(content.toString(), String(result.val)));
                          if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                          res.end(content, 'utf-8');
                        } else {
                          res.writeHead(200, { 'Content-Type': contentType });
                          content = new Buffer('Could not read state id '+query.id);
                          if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                          res.end(content, 'utf-8');
                        }
                      });
                    }
                    break;
                  default:
                    this.demoChartGauge(result => {
                      res.writeHead(200, { 'Content-Type': contentType });
                      content = new Buffer(content.toString().replace(this.placeholderStr,JSON.stringify(result)));
                      if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                      res.end(content, 'utf-8');
                    });
                    break;
                }
              } else {
                this.demoChart(result => {
                  res.writeHead(200, { 'Content-Type': contentType });
                  content = new Buffer(content.toString().replace(this.placeholderStr,JSON.stringify(result)));
                  if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                  res.end(content, 'utf-8');
                });
              }
            } else {
              if ((req.url) /*&& ( (req.url.includes('index.html')) || (req.url == '/') )*/) {
                this.demoChartGauge(result => {
                  res.writeHead(200, { 'Content-Type': contentType });
                  content = new Buffer(content.toString().replace(this.placeholderStr,JSON.stringify(result)));
                  if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
                  res.end(content, 'utf-8');
                });
              } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
              }
            }
          }
        });

        }
        this.demoChartGauge = async function(callback) {
            const option = {
              series: [
                {
                  type: 'gauge',
                  startAngle: 90,
                  endAngle: -270,
                  pointer: {
                    show: false
                  },
                  progress: {
                    show: true,
                    overlap: false,
                    roundCap: true,
                    clip: false,
                    itemStyle: {
                      borderWidth: 1,
                      borderColor: '#464646'
                    }
                  },
                  axisLine: {
                    lineStyle: {
                      width: 40
                    }
                  },
                  splitLine: {
                    show: false,
                    distance: 0,
                    length: 10
                  },
                  axisTick: {
                    show: false
                  },
                  axisLabel: {
                    show: false,
                    distance: 50
                  },
                  data: [
                      {
                        value: 20,
                        name: 'Perfect',
                        title: {
                          offsetCenter: ['0%', '-30%']
                        },
                        detail: {
                          valueAnimation: true,
                          offsetCenter: ['0%', '-20%']
                        }
                      },
                      {
                        value: 40,
                        name: 'Good',
                        title: {
                          offsetCenter: ['0%', '0%']
                        },
                        detail: {
                          valueAnimation: true,
                          offsetCenter: ['0%', '10%']
                        }
                      },
                      {
                        value: 60,
                        name: 'Commonly',
                        title: {
                          offsetCenter: ['0%', '30%']
                        },
                        detail: {
                          valueAnimation: true,
                          offsetCenter: ['0%', '40%']
                        }
                      }
                    ],
                  title: {
                      text: 'Unknown Chart Type ==> Demo Chart: Gauge',
                      fontSize: 14
                  },
                  detail: {
                    width: 50,
                    height: 14,
                    fontSize: 14,
                    color: 'inherit',
                    borderColor: 'inherit',
                    borderRadius: 20,
                    borderWidth: 1,
                    formatter: '{value}%'
                  }
                }
              ]
            };
            callback(option);
        }
  
        this.demoChart = async function(callback) {
          const data = [];
          for (let i = 0; i <= 100; i++) {
          let theta = (i / 100) * 360;
          let r = 5 * (1 + Math.sin((theta / 180) * Math.PI));
          data.push([r, theta]);
          }
          const option = {
          title: {
              text: 'Unknown Chart Type ==> Demo Chart: Two Value-Axes in Polar'
          },
          legend: {
              data: ['line']
          },
          polar: {},
          tooltip: {
              trigger: 'axis',
              axisPointer: {
              type: 'cross'
              }
          },
          angleAxis: {
              type: 'value',
              startAngle: 0
          },
          radiusAxis: {},
          series: [
              {
              coordinateSystem: 'polar',
              name: 'line',
              type: 'line',
              data: data
              }
          ]
          };
          callback(option);
        }
  
    }
}

module.exports = ExtensionFlexcharts;