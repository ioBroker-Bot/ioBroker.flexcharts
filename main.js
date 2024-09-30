'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const adapterName = require('./package.json').name.split('.').pop();

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
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		console.log('Adapter runs as a part of web service');
		this.log.warn('Adapter runs as a part of web service. Adapter instance will stay inactive.');
		this.setForeignState(`system.adapter.${this.namespace}.alive`, false, true, () =>
			setTimeout(() => this.terminate ? this.terminate() : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION), 1000));
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.debug(`Unloading instance.`);
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