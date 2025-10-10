const utils = require('@iobroker/adapter-core');
const ObjectHelper = require('@apollon/iobroker-tools'); // Get common adapter utils
const SiegeniaDevice = require('./lib/siegenia.js');
const Mapper = require('./lib/mapper.js');

class Siegenia extends utils.Adapter {
    /**
     * Constructor for the Siegenia adapter instance.
     *
     * @param {Partial<ioBroker.AdapterOptions>} [options] - Adapter options
     */
    constructor(options) {
        super({
            ...options,
            name: 'siegenia',
        });
        this.on('ready', this.onReady);
        this.on('objectChange', this.onObjectChange);
        this.on('stateChange', this.onStateChange);
        this.on('message', this.onMessage);
        this.on('unload', this.onUnload);
        this.objectHelper = ObjectHelper.objectHelper;
        this.objectHelper.init(this);
        this.devices = {};
        this.connected = null;
        this.connectedDevices = 0;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        this.setConnected(false);
        this.getForeignObject('system.config', (err, obj) => {
            let secret = 'Zgfr56gFe87jJOM';
            if (obj && obj.native && obj.native.secret) {
                secret = obj.native.secret;
            }
            if (!this.config || !this.config.devices) {
                this.config.devices = [];
            }
            this.log.info(`Initialize ${this.config.devices.length} devices`);
            this.config.devices.forEach(dev => {
                if (dev.password) {
                    dev.password = this.decrypt(secret, dev.password);
                }
                dev.comm = null;
                this.initDevice(dev, err => {
                    if (err) {
                        this.log.error(`Error initializing device ${dev.ip}: ${err}`);
                        dev.comm && dev.comm.disconnect();
                    }
                });
            });
            this.subscribeStates('*');
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback - The callback to invoke when cleanup is complete
     */
    onUnload(callback) {
        this.setConnected(false);
        for (const ip in this.devices) {
            if (!Object.hasOwn(this.devices, ip)) {
                continue;
            }
            if (this.devices[ip].comm) {
                this.devices[ip].comm.disconnect(true);
                this.devices[ip].comm = null;
            }
        }

        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     *
     * @param {string} id - The ID of the object that changed
     * @param {ioBroker.Object | null | undefined} obj - The object definition or null if deleted
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
     *
     * @param {string} id - The ID of the state that changed
     * @param {ioBroker.State | null | undefined} state - The state value or null if deleted
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

    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.message" property to be set to true in io-package.json
     *
     * @param {ioBroker.Message} obj - The message object
     */
    onMessage(obj) {
        this.log.debug(`Request: ${JSON.stringify(obj)}`);
        if (typeof obj === 'object' && obj.command) {
            if (obj.command === 'discover') {
                this.discoverSiegenia(5000, (err, ips) => {
                    this.log.debug(`Discovery result: ${JSON.stringify(ips)}`);
                    // Send response in callback if required
                    this.sendTo(obj.from, obj.command, ips, obj.callback);
                });
            }
        }
    }

    decrypt(key, value) {
        let result = '';
        for (let i = 0; i < value.length; ++i) {
            result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
        }
        return result;
    }

    setConnected(isConnected) {
        if (this.connected !== isConnected) {
            this.connected = !!isConnected;
            this.setState('info.connection', this.connected, true);
        }
    }

    getBasicData(ip, callback) {
        const options = {
            ip: ip,
            logger: this.log.debug,
        };
        this.log.debug(`check device ${ip}`);
        const dev = new SiegeniaDevice(options);
        dev.on('connected', () => {
            dev.getDeviceInfo((err, status, data) => {
                dev.disconnect(true);
                if (status !== 'ok') {
                    callback && callback({ ip: ip, name: '' });
                    callback = null;
                } else {
                    callback &&
                        callback({
                            ip: ip,
                            name: `${data.devicename}(${data.devicefloor} ${data.devicelocation})`,
                        });
                    callback = null;
                }
            });
            dev.on('closed', (code, reason) => {
                this.log.info(`Connection to Device ${ip}: CLOSED ${code} / ${reason}`);
                callback && callback({ ip: ip, name: '' });
                callback = null;
            });
            dev.on('error', error => {
                this.log.error(`Device ${ip}: ERROR ${error}`);
                callback && callback({ ip: ip, name: '' });
                callback = null;
            });
        });
        dev.connect();
    }

    discoverSiegenia(timeout, callback) {
        const foundIps = [];

        if (!timeout) {
            timeout = 5000;
        }

        const mdns = require('mdns-js');
        mdns.excludeInterface('0.0.0.0');

        const browser = mdns.createBrowser();

        browser.on('ready', () => {
            browser.discover();
            this.log.debug('Start discovery for Siegenia devices');
        });

        browser.on('update', data => {
            this.log.debug(`Discovery answer: ${JSON.stringify(data)}`);
            if (!data.addresses || !data.addresses[0] || !data.type) {
                return;
            }
            for (let i = 0; i < data.type.length; i++) {
                if (data.type[i].name === 'siegenia') {
                    this.getBasicData(data.addresses[0], data => {
                        if (data) {
                            if (data.name === undefined) {
                                data.name = '';
                            }
                            if (data.user === undefined) {
                                data.user = 'user';
                            }
                            if (data.password === undefined) {
                                data.password = '0000';
                            }
                            foundIps.push(data);
                        }
                    });
                }
            }
        });

        this.setTimeout(() => {
            browser.stop();
            this.log.debug(`Discovery finished: ${JSON.stringify(foundIps)}`);
            callback && callback(null, foundIps);
        }, timeout);
    }

    initObjects(device, channel, data, command) {
        let baseId = device.id;
        if (channel !== '') {
            baseId += `.${channel}`;
            this.objectHelper.setOrUpdateObject(baseId, {
                type: 'channel',
                common: {
                    name: (device.name || device.id) + channel.charAt(0).toUpperCase() + channel.slice(1),
                },
            });
        }
        baseId += '.';

        const objs = Mapper.mapToObjects(command, device.type, data);
        this.log.debug(`Objects for ${device.ip}/${command}/${channel}: ${JSON.stringify(objs)}`);
        this.createObjects(device, baseId, objs);
    }

    createObjects(device, baseId, objs) {
        for (const key in objs) {
            if (!Object.hasOwn(objs, key)) {
                continue;
            }
            let onChange = null;
            const initValue = objs[key].value;
            const native = objs[key].native;
            delete objs[key].value;
            delete objs[key].native;
            if (objs[key].write) {
                onChange = value => {
                    value = Mapper.mapValueForWrite(key, value, native);
                    this.log.debug(`onStateChange Device ${device.ip}: ${JSON.stringify(value)}`);
                    this.devices[device.ip].comm.setDeviceParams(value, (err, status, _data) => {
                        if (err) {
                            this.log.error(err);
                        }
                        if (status !== 'ok') {
                            this.log.error(`set Device Parameter Error for device ${device.ip}: ${status}`);
                        }
                        this.setState(`${device.id}.lastStatus`, status || 'Error', true);
                    });
                };
            }

            this.log.debug(
                `Create ${baseId}${key}: ${JSON.stringify(
                    objs[key],
                )} / ${JSON.stringify(native)} / ${!!onChange} / Value = ${initValue}`,
            );
            this.objectHelper.setOrUpdateObject(
                baseId + key,
                {
                    type: 'state',
                    common: objs[key],
                    native: native,
                },
                ['name'],
                initValue,
                onChange,
            );
        }
    }

    initDeviceObjects(device, callback) {
        device.comm.getDeviceInfo((err, status, data) => {
            if (err) {
                return callback && callback(err);
            }
            if (status !== 'ok') {
                return callback && callback(new Error(`Get Device Info Error for device ${device.ip}: ${status}`));
            }

            if (!data.type || !Mapper.DeviceTypeMap[data.type]) {
                return callback && callback(new Error(`Unknown device type for device ${device.ip}: ${data.type}`));
            }
            device.type = data.type;
            this.initObjects(device, 'info', data, 'getDevice');

            device.comm.loginUser(device.user, device.password, (err, status, data) => {
                if (err) {
                    return callback && callback(err);
                }
                if (status !== 'ok') {
                    return callback && callback(new Error(`Login Error for device ${device.ip}: ${status}`));
                }
                device.token = data.token;

                device.comm.getDeviceState((err, status, data) => {
                    if (err) {
                        return callback && callback(err);
                    }
                    if (status !== 'ok') {
                        return (
                            callback && callback(new Error(`Get Device State Error for device ${device.ip}: ${status}`))
                        );
                    }

                    this.initObjects(device, 'params', data, 'getDeviceState');

                    device.comm.getDeviceParams((err, status, data) => {
                        if (err) {
                            return callback && callback(err);
                        }
                        if (status !== 'ok') {
                            return (
                                callback &&
                                callback(new Error(`Get Device Parameters Error for device ${device.ip}: ${status}`))
                            );
                        }

                        this.initObjects(device, 'params', data, 'getDeviceParams');
                        const specialObjs = Mapper.getSpecialDeviceObjects(device.type);
                        if (specialObjs) {
                            this.createObjects(device, `${device.id}.params.`, specialObjs);
                        }

                        device.comm.getDeviceDetails((err, status, data) => {
                            if (err) {
                                return callback && callback(err);
                            }
                            if (status !== 'ok') {
                                return (
                                    callback &&
                                    callback(new Error(`Get Device Details Error for device ${device.ip}: ${status}`))
                                );
                            }

                            this.initObjects(device, 'details', data, 'getDeviceDetails');

                            this.objectHelper.setOrUpdateObject(
                                `${device.id}.reboot`,
                                {
                                    type: 'state',
                                    common: {
                                        name: 'Reboot Device',
                                        type: 'boolean',
                                        role: 'button',
                                        read: false,
                                        write: true,
                                    },
                                },
                                false,
                                _value => {
                                    this.devices[device.ip].comm.rebootDevice((err, status, _data) => {
                                        if (err) {
                                            this.log.error(err);
                                        }
                                        if (status !== 'ok') {
                                            this.log.error(`Reboot Error for device ${device.ip}: ${status}`);
                                        }
                                        this.setState(`${device.id}.lastStatus`, status || 'Error', true);
                                    });
                                },
                            );

                            this.devices[device.ip] = device;
                            this.objectHelper.processObjectQueue(callback);
                        });
                    });
                });
            });
        });
    }

    initDevice(device, callback) {
        if (!device.ip.length) {
            this.setConnected(--this.connectedDevices > 0);
            return callback && callback(new Error('IP not set'));
        }
        const options = {
            ip: device.ip,
            port: device.port,
            wsProtocol: device.wsProtocol,
            logger: this.log.debug,
        };
        device.id = device.ip.trim().replace(/\./g, '_');

        this.log.debug(`init device ${device.id}`);
        device.comm = new SiegeniaDevice(options);
        device.comm.on('connected', () => {
            this.objectHelper.setOrUpdateObject(device.id, {
                type: 'device',
                common: {
                    name: device.name || `Device ${device.id}`,
                },
                native: { ip: device.ip },
            });
            this.objectHelper.setOrUpdateObject(
                `${device.id}.lastStatus`,
                {
                    type: 'state',
                    common: {
                        name: 'Device online status',
                        type: 'boolean',
                        role: 'indicator.reachable',
                        read: true,
                        write: false,
                    },
                },
                true,
            );
            this.objectHelper.setOrUpdateObject(
                `${device.id}.lastStatus`,
                {
                    type: 'state',
                    common: {
                        name: 'Status from last Device command',
                        type: 'string',
                        role: 'text',
                        read: true,
                        write: false,
                    },
                },
                '',
            );

            this.initDeviceObjects(device, callback);
            this.connectedDevices++;
            this.setConnected(true);
        });
        device.comm.on('closed', (code, reason) => {
            this.log.info(`Connection to Device ${device.ip}: CLOSED ${code} / ${reason}`);
            this.setState(`${device.id}.online`, false, true);
            this.setConnected(--this.connectedDevices > 0);
        });
        device.comm.on('error', error => {
            this.log.error(`Device ${device.ip}: ERROR ${error}`);
        });
        device.comm.on('reconnected', () => {
            this.log.info(`Connection to Device ${device.ip}: RECONNECTED`);
            this.setState(`${device.id}.online`, true, true);
            this.initDeviceObjects(this.devices[device.ip], callback);
            this.objectHelper.processObjectQueue();
            this.connectedDevices++;
            this.setConnected(true);
        });
        device.comm.on('data', (status, data, command) => {
            this.log.debug(`DATA for ${device.ip}:${command} / ${status} / ${JSON.stringify(data)}`);
            if (data) {
                if (command === 'deviceParams') {
                    command = 'getDeviceParams';
                }
                const states = Mapper.mapToStates(command, this.devices[device.ip].type, data);
                this.log.debug(`Set States for ${device.ip}: ${JSON.stringify(states)}`);
                for (const key in states) {
                    if (!Object.hasOwn(states, key)) {
                        continue;
                    }
                    this.setState(`${this.devices[device.ip].id}.params.${key}`, states[key], true);
                }
            }
        });

        device.comm.connect();
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * Exports the Siegenia adapter constructor in compact mode.
     *
     * @param {Partial<ioBroker.AdapterOptions>} [options] - Adapter options
     * @returns {Siegenia} A new Siegenia adapter instance
     */
    module.exports = options => new Siegenia(options);
} else {
    // otherwise start the instance directly
    (() => new Siegenia())();
}
