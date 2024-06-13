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
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info('config port: ' + this.config.port);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectNotExistsAsync('testVariable', {
			type: 'state',
			common: {
				name: 'testVariable',
				type: 'boolean',
				role: 'indicator',
				read: true,
				write: true,
			},
			native: {},
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates('testVariable');
		this.subscribeStates('flexcharts.0.test.testMessage');
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates('lights.*');
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates('*');

		this.startWebServer();
	}

	startWebServer(adapter) {
		this.log.debug(`Starting web server on http://localhost:${this.config.port}/`);

		// Hilfsfunktion, um den MIME-Typ basierend auf der Dateierweiterung zu bestimmen
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

		// Erstelle den HTTP-Server
		const server = http.createServer((req, res) => {
			this.log.debug(`Request for ${req.url}`);

			const parts = (req.url || '').split('?');
			const url = parts[0];
			const query = {};
			(parts[1] || '').split('&').forEach(p => {
				const pp = p.split('=');
				query[pp[0]] = decodeURIComponent(pp[1] || '');
			});

			// Datei-Pfad basierend auf der angeforderten URL
			let filePath = '.' + url;
			if (filePath == './') {
				filePath = './index.html';
			}
			//this.log.debug(`filePath = ${filePath}`);
			//this.log.debug(`query    = ${JSON.stringify(query)}`);

			// Bestimme den MIME-Typ der Datei
			const contentType = getMimeType(filePath);

			// Lese die Datei vom Dateisystem
			fs.readFile(filePath, (error, content) => {
				//this.log.debug(`content = ${content}`);
				if (error) {
					if (error.code == 'ENOENT') {
						// Datei nicht gefunden
						fs.readFile('./404.html', (error404, content404) => {
							res.writeHead(404, { 'Content-Type': 'text/html' });
							res.end(content404, 'utf-8');
						});
					} else {
						// Ein anderer Fehler
						res.writeHead(500);
						res.end(`Server Error: ${error.code}`);
					}
				} else {
					// Datei gefunden, sende den Inhalt
					if ((req.url) && (req.url.includes('echarts.html'))) {
						this.sendTo('javascript.0', 'toScript', {
							message: 'myechart',
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
										res.end(content, 'utf-8');
									});
								} else {
									res.writeHead(200, { 'Content-Type': contentType });
									content = new Buffer(content.toString().replace('{ solution: 42 }',JSON.stringify(result)));
									res.end(content, 'utf-8');
								}
							}
						);
					} else {
						if ((req.url) && ( (req.url.includes('index.html')) || (req.url == '/') )) {
							this.demoChartGauge(result => {
								res.writeHead(200, { 'Content-Type': contentType });
								content = new Buffer(content.toString().replace('{ solution: 42 }',JSON.stringify(result)));
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

		// Starte den Server
		server.listen({port: this.config.port}, () => {
			this.log.info(`Server started on localhost:${this.config.port}`);
		});
	}

	demoChartGauge(callback) {
		const gaugeData = [
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
		  ];
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
				data: gaugeData,
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
	
	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

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