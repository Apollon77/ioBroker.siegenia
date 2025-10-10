'use strict';

const ws = require('ws');
const EventEmitter = require('events');

// Not implemented
// - Change Password
// - Get User Details
// - Get Bonjour-Devices
// - System Events
// - Wifi Settings
// - System Update
//

/**
 * Represents a Siegenia device connection using WebSocket communication.
 */
class SiegeniaDevice extends EventEmitter {
    /**
     * Creates a new Siegenia device connection instance.
     *
     * @param {object} options - Configuration options for the device connection
     */
    constructor(options) {
        super();

        this.options = options || {};
        this.ip = options.ip;
        this.port = options.port || 443;
        this.wsProtocol = options.wsProtocol || 'wss';
        this.logger = options.logger || function () {};
        this.websocket = null;

        this.requestId = 1;

        this.awaitingResponses = {};
        this.responseWaitTime = 3000;

        this.reconnectTimeout = null;
        this.wasConnected = false;
        this.heartbeatTimeout = null;

        this.errorCounter = 0;
        this.stop = false;
    }

    /**
     * Sends a request command to the Siegenia device via WebSocket.
     *
     * @param {string | object} command - The command to send or a command object
     * @param {object} [params] - Optional parameters for the command
     * @param {Function} [callback] - Callback function to handle the response
     */
    sendRequest(command, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = undefined;
        }
        if (!this.websocket) {
            return callback && callback(new Error('Connection not initialized'));
        }

        const reqId = ++this.requestId;
        let req;
        if (typeof command === 'string') {
            req = {
                command: command,
            };
        } else {
            req = command;
        }
        if (params !== undefined) {
            req.params = params;
        }
        req.id = reqId;

        if (callback) {
            this.awaitingResponses[reqId] = {};
            this.awaitingResponses[reqId].callback = callback;
            this.awaitingResponses[reqId].timeout = setTimeout(() => {
                this.logger(`${this.ip}:TIMEOUT for ${reqId}`);
                if (this.awaitingResponses[reqId].callback) {
                    this.awaitingResponses[reqId].callback(new Error('Timeout'));
                }
                delete this.awaitingResponses[reqId];
            }, this.responseWaitTime);
        }

        this.logger(`${this.ip}: SEND: ${JSON.stringify(req)}`);
        this.websocket.send(JSON.stringify(req));
    }

    /**
     * Authenticates a user with username and password.
     *
     * @param {string} user - The username
     * @param {string} password - The password
     * @param {Function} [callback] - Callback function for the login response
     */
    loginUser(user, password, callback) {
        const req = {
            command: 'login',
            user: user,
            password: password,
            long_life: false,
        };
        this.sendRequest(req, callback);
    }

    /**
     * Authenticates using an access token.
     *
     * @param {string} token - The authentication token
     * @param {Function} [callback] - Callback function for the login response
     */
    loginToken(token, callback) {
        const req = {
            command: 'login',
            token: token,
        };
        this.sendRequest(req, callback);
    }

    /**
     * Logs out the current user session.
     *
     * @param {Function} [callback] - Callback function for the logout response
     */
    logout(callback) {
        this.sendRequest('logout', callback);
    }

    /**
     * Sends periodic keepAlive messages to maintain the connection.
     *
     * @param {number} [delay] - Delay in milliseconds between heartbeat messages (default: 10000)
     */
    heartbeat(delay) {
        if (delay === undefined) {
            delay = 10000;
        }
        this.heartbeatTimeout = setTimeout(() => {
            this.heartbeatTimeout = null;
            this.sendRequest('keepAlive', { extend_session: true }, (err, status) => {
                if (err) {
                    return this.emit('error', err);
                }
                if (status !== 'ok') {
                    return this.emit('error', new Error(`Response from hartbeat "${status}" is not ok`));
                }

                this.heartbeat();
            });
        }, delay);
    }

    /**
     * Retrieves the current state of the device.
     *
     * @param {Function} [callback] - Callback function for the device state response
     */
    getDeviceState(callback) {
        this.sendRequest('getDeviceState', callback);
    }

    /**
     * Resets the device to factory defaults.
     *
     * @param {Function} [callback] - Callback function for the reset response
     */
    resetDevice(callback) {
        this.sendRequest('resetDevice', callback);
    }

    /**
     * Reboots the device.
     *
     * @param {Function} [callback] - Callback function for the reboot response
     */
    rebootDevice(callback) {
        this.sendRequest('rebootDevice', callback);
    }

    /**
     * Renews the device SSL certificate.
     *
     * @param {Function} [callback] - Callback function for the certificate renewal response
     */
    renewCert(callback) {
        this.sendRequest('renewCert', callback);
    }

    /**
     * Retrieves basic device information.
     *
     * @param {Function} [callback] - Callback function for the device info response
     */
    getDeviceInfo(callback) {
        this.sendRequest('getDevice', callback);
    }

    /**
     * Retrieves current device parameters.
     *
     * @param {Function} [callback] - Callback function for the device parameters response
     */
    getDeviceParams(callback) {
        this.sendRequest('getDeviceParams', callback);
    }

    /**
     * Sets device parameters.
     *
     * @param {object} params - The parameters to set
     * @param {Function} [callback] - Callback function for the set parameters response
     */
    setDeviceParams(params, callback) {
        this.sendRequest('setDeviceParams', params, callback);
    }

    /**
     * Retrieves detailed information about the device.
     *
     * @param {Function} [callback] - Callback function for the device details response
     */
    getDeviceDetails(callback) {
        this.sendRequest('getDeviceDetails', callback);
    }

    /**
     * Establishes a WebSocket connection to the device.
     *
     * @param {Function} [callback] - Callback function for the connection result
     */
    connect(callback) {
        if (this.websocket) {
            return (
                callback &&
                callback(new Error('initializeCall for Websocket, but Websocket already set, so ignore call'))
            );
        }

        this.stop = false;
        this.websocket = new ws(`${this.wsProtocol}://${this.ip}:${this.port}/WebSocket`, {
            rejectUnauthorized: false,
            origin: `${this.wsProtocol}://${this.ip}:${this.port}`,
        });

        this.websocket.on('open', () => {
            this.logger(`${this.ip}: Websocket Open for Session, starting heartbeat`);
            this.heartbeat(1000);
            if (!this.wasConnected) {
                this.wasConnected = true;
                this.emit('connected');
            } else {
                this.emit('reconnected');
            }
            callback && callback();
        });

        this.websocket.on('close', (code, reason) => {
            this.logger(`${this.ip}: Websocket Close ${code}: ${reason}`);
            this.websocket = null;
            this.errorCounter++;
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
            if (!this.stop) {
                let reconnectDelay = this.errorCounter * 5 + 5;
                if (reconnectDelay > 60) {
                    reconnectDelay = 60;
                }
                this.logger(`${this.ip}: Reconnect in ${reconnectDelay}s`);
                this.reconnectTimeout = setTimeout(() => {
                    this.logger(`${this.ip}: Reconnect ... (${this.errorCounter})`);
                    this.reconnectTimeout = null;
                    this.connect();
                }, reconnectDelay * 1000);
            }
            this.emit('closed', code, reason);
        });

        this.websocket.on('error', error => {
            this.logger(`${this.ip}: Websocket Error: ${error}`);
            if (this.websocket) {
                this.websocket.terminate();
            }
        });

        this.websocket.on('unexpected-response', (request, response) => {
            this.logger(
                `${this.ip}: Websocket Unexpected Response: ${response.statusCode} / ${response.statusMessage}`,
            );
            if (this.websocket) {
                this.websocket.terminate();
            }
        });

        this.websocket.on('message', data => {
            if (this.errorCounter > 1) {
                this.logger(`${this.ip}: Message ${data} resets ErrorCounter`);
            }
            this.errorCounter = 0;

            let dataObj;
            try {
                dataObj = JSON.parse(data.toString());
            } catch (e) {
                this.emit('error', new Error(`Error JSON: ${e}: ${data}`));
                return;
            }

            this.logger(`${this.ip}: RECEIVED ${data.toString().trim()}`);
            if (dataObj && dataObj.id && this.awaitingResponses[dataObj.id]) {
                if (this.awaitingResponses[dataObj.id].timeout) {
                    clearTimeout(this.awaitingResponses[dataObj.id].timeout);
                }
                this.awaitingResponses[dataObj.id].callback(null, dataObj.status, dataObj.data);
                delete this.awaitingResponses[dataObj.id];
            } else {
                this.emit('data', dataObj.status, dataObj.data, dataObj.command);
            }
        });
    }

    /**
     * Disconnects from the device and closes the WebSocket connection.
     *
     * @param {boolean} [force] - If true, forces immediate disconnection without clean logout
     */
    disconnect(force) {
        this.stop = true;
        if (!this.websocket) {
            return;
        }
        if (force) {
            this.websocket.terminate();
        } else {
            this.websocket.close();
        }
    }
}

module.exports = SiegeniaDevice;
