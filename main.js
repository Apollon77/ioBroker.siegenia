'use strict';

/*
 * Created with @iobroker/create-adapter v1.8.0
 */

const utils = require('@iobroker/adapter-core');
const ObjectHelper = require('@apollon/iobroker-tools'); // Get common adapter utils
const SiegeniaDevice = require('./lib/siegenia.js');
const Mapper = require('./lib/mapper.js');

class Siegenia extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'siegenia',
        });
        this.on('ready', this.onReady);
        this.on('objectChange', this.onObjectChange);
        this.on('stateChange', this.onStateChange);
        // this.on("message", this.onMessage);
        this.on('unload', this.onUnload);
        this.objectHelper = ObjectHelper.objectHelper;
        this.objectHelper.init(this);
        this.devices = {};
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        if (!this.config || !this.config.devices) {
            this.config.devices = [];
        }
        this.log.info('Initialize ' + this.config.devices.length + ' devices');
        let deviceCount = this.config.devices.length;
        this.config.devices.forEach((dev) => {
            this.initDevice(dev, (err) => {
                if (--deviceCount === 0) {
                    this.objectHelper.processObjectQueue(() => {
                        this.subscribeStates('*');
                    });
                }
            });
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            this.objectHelper.handleStateChange(id, state);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }

    initObjects(device, channel, data, command) {
        let baseId = device.id + '.';
        if (channel !== '') {
            baseId += channel + '.';
            this.objectHelper.setOrUpdateObject(baseId, {
                type: 'channel',
                common: {
                    name: (device.name || device.id) + channel.charAt(0).toUpperCase() + channel.slice(1)
                }
            });
        }

        const objs = Mapper.mapToObjects(command, device.type, data);
        this.log.debug('Objects for ' + device.ip + '/' + command + '/' + channel + ': ' + JSON.stringify(objs));
        for (const key in objs) {
            if (!objs.hasOwnProperty(key)) continue;
            let onChange = null;
            const initValue = objs[key].value;
            const native = objs[key].native;
            delete objs[key].value;
            delete objs[key].native;
            if (objs[key].write) {
                onChange = (value) => {
                    value = Mapper.mapValueForWrite(key, value, native);
                    this.log.debug('onStateChange Device ' + device.ip + ': ' + value);
                    this.devices[device.ip].comm.setDeviceParams(value, (err, status, data) => {
                        if (err) {
                            this.log.error(err);
                        }
                        if (status !== 'ok') {
                            this.log.error('set Device Parameter Error for device ' + device.ip + ': ' + status);
                        }
                    });
                }
            }

            this.log.debug('Create ' + baseId + key + ': ' + JSON.stringify(objs[key]) + ' / ' + JSON.stringify(native) + ' / ' + !!onChange);
            this.objectHelper.setOrUpdateObject(baseId + key, {
                type: 'state',
                common: objs[key],
                native: native
            }, [name], initValue, onChange);
        }
    };

    initDevice(device, callback) {
        if (!device.ip.length) {
            return callback && callback(new Error('IP not set'));
        }
        const options = {
            ip: device.ip,
            port: device.port,
            wsProtocol: device.wsProtocol,
            logger: this.log.debug
        };
        device.id = device.ip.trim().replace(/\./g, '_');

        device.comm = new SiegeniaDevice(options);
        device.comm.on('connected', () => {

            this.objectHelper.setOrUpdateObject(device.id, {
                type: 'device',
                common: {
                    name: device.name || 'Device ' + device.id
                },
                native: {ip: device.ip}
            });
            this.objectHelper.setOrUpdateObject(device.id + '.online', {
                type: 'state',
                common: {
                    name: 'Device online status',
                    type: 'boolean',
                    role: 'indicator.reachable',
                    read: true,
                    write: false
                }
            }, true);


            device.comm.getDeviceInfo((err, status, data) => {
                if (err) {
                    return callback && callback(err);
                }
                if (status !== 'ok') {
                    return callback && callback(new Error('Get Device Info Error for device ' + device.ip + ': ' + status));
                }

                if (!data.type || !Mapper.DeviceTypeMap[data.type]) {
                    return callback && callback(new Error('Unknown device type for device ' + device.ip + ': ' + data.type));
                }
                device.type = data.type;
                this.initObjects(device, 'info', data, 'getDevice');

                device.comm.loginUser(device.isAdmin, device.password, (err, status, data) => {
                    if (err) {
                        return callback && callback(err);
                    }
                    if (status !== 'ok') {
                        return callback && callback(new Error('Login Error for device ' + device.ip + ': ' + status));
                    }
                    device.token = data.token;

                    device.comm.getDeviceState((err, status, data) => {
                        if (err) {
                            return callback && callback(err);
                        }
                        if (status !== 'ok') {
                            return callback && callback(new Error('Get Device State Error for device ' + device.ip + ': ' + status));
                        }

                        this.initObjects(device, 'params', data, 'getDeviceState');

                        device.comm.getDeviceParams((err, status, data) => {
                            if (err) {
                                return callback && callback(err);
                            }
                            if (status !== 'ok') {
                                return callback && callback(new Error('Get Device Parameters Error for device ' + device.ip + ': ' + status));
                            }

                            this.initObjects(device, 'params', data, 'getDeviceParams');

                            device.comm.getDeviceDetails((err, status, data) => {
                                if (err) {
                                    return callback && callback(err);
                                }
                                if (status !== 'ok') {
                                    return callback && callback(new Error('Get Device Details Error for device ' + device.ip + ': ' + status));
                                }

                                this.initObjects(device, 'details', data, 'getDeviceDetails');

                                this.objectHelper.setOrUpdateObject(device.id + '.reboot', {
                                    type: 'state',
                                    common: {
                                        name: 'Reboot Device',
                                        type: 'boolean',
                                        role: 'button',
                                        read: false,
                                        write: true
                                    }
                                }, false, (value) => {
                                    this.devices[device.ip].comm.rebootDevice((err, status, data) => {
                                        if (err) {
                                            this.log.error(err);
                                        }
                                        if (status !== 'ok') {
                                            this.log.error('Reboot Error for device ' + device.ip + ': ' + status);
                                        }
                                    });
                                });

                                this.devices[device.ip] = device;
                                callback && callback();
                            });
                        });
                    });
                });
            });
        });
        device.comm.on('closed', (code, reason) => {
            this.log.info('Connection to Device ' + device.ip + ': CLOSED ' + code + ' / ' + reason);
            this.setState(device.id + '.online', false, true);
        });
        device.comm.on('error', (error) => {
            this.log.error('Device ' + device.ip + ': ERROR ' + error);
        });
        device.comm.on('reconnected', () => {
            this.log.info('Connection to Device ' + device.ip + ': RECONNECTED');
            this.setState(device.id + '.online', true, true);
        });
        device.comm.on('data', (status, data, command) => {
            this.log.debug('DATA for ' + device.ip + ':' + command + ' / ' + status + ' / ' + JSON.stringify(data));
            if (data) {
                const states = Mapper.mapToStates(command, this.devices[device.ip].type, data);
                this.log.debug('Set States for ' + device.ip + ': ' + JSON.stringify(states));
                for (const key in states) {
                    if (!states.hasOwnProperty(key)) continue;
                    this.setState(this.devices[device.ip].id + '.params.' + key, states[key], true);
                }
            }
        });

        device.comm.connect();
    }
}

// @ts-ignore
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Siegenia(options);
} else {
    // otherwise start the instance directly
    new Siegenia();
}