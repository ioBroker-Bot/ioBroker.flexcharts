'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

const http  = require('http');
const url  = require('url');

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
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates('lights.*');
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates('*');

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync('testVariable', true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync('testVariable', { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync('admin', 'iobroker');
		this.log.info('check user admin pw iobroker: ' + result);

		result = await this.checkGroupAsync('admin', 'admin');
		this.log.info('check group user admin group admin: ' + result);

		this.startWebServer();

	}

	startWebServer(adapter) {
		this.log.debug(`Starting web server on http://${this.config.bind}:${this.config.port}/`);

		const server = http.createServer((req, res) => {
			// Parse die URL und die Query-Parameter
			this.log.debug(String(req.url));
			const parsedUrl = url.parse(String(req.url), true);
			this.log.debug(JSON.stringify(parsedUrl));
			const queryParameters = parsedUrl.query;
		
			// Beispiel: Basis-URL, die verwendet wird, um die Weiterleitungs-URL zu erstellen
			//const baseUrl = 'http://fritz.box';
			const baseUrl = String(queryParameters.url);
		
			// Erstelle die Weiterleitungs-URL mit den übergebenen Parametern
			let redirectUrl = '';
			redirectUrl = baseUrl; // + '?' + new URLSearchParams(queryParameters).toString();
		
			// Setze den HTTP-Status auf 302 (Found) und die Location-Header auf die Weiterleitungs-URL
			res.writeHead(302, { 'Location': redirectUrl });
		
			// Beende die Antwort
			res.end();
		});
		
		// Starte den Server
		server.listen({port: this.config.port, host: this.config.bind}, () => {
			this.log.info(`Server started on ${this.config.bind}:${this.config.port}`);
		});
		

/*
		this.__server = http.createServer(async (req, res) => {
			const clientIp = req.socket.remoteAddress;
			if (!clientIp) {
				res.statusCode = 401;
				res.write('Invalid key');
				res.end();
				this.log.debug(`Invalid key from unknown IP`);
				return;
			}
			const parts = (req.url || '').split('?');
			const url = parts[0];
			const query = {};
			(parts[1] || '').split('&').forEach(p => {
				const pp = p.split('=');
				query[pp[0]] = decodeURIComponent(pp[1] || '');
			});
	
			const now = Date.now();

			res.setHeader('Content-type', 'text');
			res.write('Hello flexcharts!');
			res.end();
	
		});
	
		this.__server.on('clientError', (err, socket) =>
			socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
	
		this.__server.listen({port: this.config.port || '127', host: this.config.bind}, () =>
			this.log.info(`Server started on ${this.config.bind}:${this.config.port}`));
*/
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