'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

const http  = require('http');
const url  = require('url');
const fs = require('fs');
const path = require('path');

// Load your modules here, e.g.:
// const fs = require("fs");

class Flexcharts extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'flexcharts',
		});

		this.webServer = null;

		this.on('ready', this.onReady.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		this.startWebServer(await this.getPortAsync(Number(this.config.port)));
	}

	startWebServer(available_port) {
		// available_port: Next available port number
		this.log.debug(`Starting web server on http://localhost:${this.config.port}/`);

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

		// Create HTTP-server for configured port
		this.webServer = http.createServer((req, res) => {
			this.log.debug(`Request for ${req.url}`);

			const parts = (req.url || '').split('?');
			const url = parts[0];
			const query = {};
			(parts[1] || '').split('&').forEach(p => {
				const pp = p.split('=');
				query[pp[0]] = decodeURIComponent(pp[1] || '');
			});

			// Extrect path of file from provided URL
			let filePath = '.' + url;
			if (filePath == './') {
				filePath = './index.html';
			}
			//this.log.debug(`filePath = ${filePath}`);
			//this.log.debug(`query    = ${JSON.stringify(query)}`);

			// Select MIME-type
			const contentType = getMimeType(filePath);

			// Read file
			fs.readFile(filePath, (error, content) => {
				//this.log.debug(`content = ${content}`);
				if (error) {
					if (error.code == 'ENOENT') {
						// File not found
						fs.readFile('./404.html', (error404, content404) => {
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
					if ((req.url) && (req.url.includes('echarts.html'))) {
						if (query.source) {
							switch (query.source) {
								case 'script':
									let message = 'flexcharts';
									if (query.message) { message = query.message; }
									this.sendTo('javascript.0', 'toScript', {
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
													content = new Buffer(content.toString().replace('{ solution: 42 }',JSON.stringify(result)));
													if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
													res.end(content, 'utf-8');
												});
											} else {
												res.writeHead(200, { 'Content-Type': contentType });
												content = new Buffer(content.toString().replace('{ solution: 42 }',JSON.stringify(result)));
												if ('darkmode' in query) content = new Buffer(content.toString().replace("document.getElementById('main'),null,","document.getElementById('main'),'dark',"));
												res.end(content, 'utf-8');
											}
										}	
									);
									break;
								case 'state':
									if (query.id) {
										this.getForeignState(query.id, (error, result) => {
											if ( (result) && (result.val) ) {
												//this.log.debug(JSON.stringify(result.val));
												res.writeHead(200, { 'Content-Type': contentType });
												content = new Buffer(content.toString().replace('{ solution: 42 }',String(result.val)));
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
									break;
							}
						}
					} else {
						if ((req.url) && ( (req.url.includes('index.html')) || (req.url == '/') )) {
							this.demoChartGauge(result => {
								res.writeHead(200, { 'Content-Type': contentType });
								content = new Buffer(content.toString().replace('{ solution: 42 }',JSON.stringify(result)));
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
		});

		// Start server
		if (available_port == Number(this.config.port)) {
			// Requested port is available
			this.webServer.listen({port: this.config.port}, () => {
				this.log.info(`Server started on localhost:${this.config.port}`);
				this.setState('info.connection', true, true);
			});
		} else {
			// Error: Requested port is already in use.
			this.log.error(`Start of http server failed on localhost:${this.config.port}. Port is already in use. Next available port is ${available_port}. Pls. change port in configuration of instance.`);
			this.setState('info.connection', false, true);
		}
}

	demoChartGauge(callback) {
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

	demoChart(callback) {
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
	

		/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			if (this.webServer) {
				this.webServer.removeAllListeners();
				this.webServer.close();
			}
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
			
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Flexcharts(options);
} else {
	// otherwise start the instance directly
	new Flexcharts();
}