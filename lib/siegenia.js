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


class SiegeniaDevice extends EventEmitter {

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
                'command': command
            };
        }
        else {
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
                this.logger(this.ip + ':TIMEOUT for ' + reqId);
                if (this.awaitingResponses[reqId].callback) {
                    this.awaitingResponses[reqId].callback(new Error('Timeout'));
                }
                delete this.awaitingResponses[reqId];
            }, this.responseWaitTime);
        }

        this.logger(this.ip + ': SEND: ' + JSON.stringify(req));
        this.websocket.send(JSON.stringify(req));
    }

    loginUser(user, password, callback) {
        const req =  {
            'command': 'login',
            'user': user,
            'password': password,
            'long_life': false
        };
        this.sendRequest(req, callback);
    }

    loginToken(token, callback) {
        const req =  {
            'command': 'login',
            'token': token
        };
        this.sendRequest(req, callback);
    }

    logout(callback) {
        this.sendRequest('logout', callback);
    }

    heartbeat(delay) {
        if (delay === undefined) {
            delay = 10000;
        }
        this.heartbeatTimeout = setTimeout(() => {
            this.heartbeatTimeout = null;
            this.sendRequest('keepAlive', {'extend_session': true}, (err, status) => {
                if (err) {
                    return this.emit('error', err);
                }
                if (status !== 'ok') {
                    return this.emit('error', new Error('Response from hartbeat "' + status + '" is not ok'));
                }

                this.heartbeat();
            });
        }, delay);
    }

    getDeviceState(callback) {
        this.sendRequest('getDeviceState', callback);
    }

    resetDevice(callback) {
        this.sendRequest('resetDevice', callback);
    }

    rebootDevice(callback) {
        this.sendRequest('rebootDevice', callback);
    }

    renewCert(callback) {
        this.sendRequest('renewCert', callback);
    }

    getDeviceInfo(callback) {
        this.sendRequest('getDevice', callback);
    }

    getDeviceParams(callback) {
        this.sendRequest('getDeviceParams', callback);
    }

    setDeviceParams(params, callback) {
        this.sendRequest('setDeviceParams', params, callback);
    }

    getDeviceDetails(callback) {
        this.sendRequest('getDeviceDetails', callback);
    }


    connect(callback) {
        if (this.websocket) {
            return callback && callback(new Error('initializeCall for Websocket, but Websocket already set, so ignore call'));
        }

        this.stop = false;
        this.websocket = new ws(this.wsProtocol + '://' + this.ip + ':' + this.port + '/WebSocket', {
            rejectUnauthorized: false,
            origin: this.wsProtocol + '://' + this.ip + ':' + this.port
        });

        this.websocket.on('open', () => {
            this.logger(this.ip + ': Websocket Open for Session, starting heartbeat');
            this.heartbeat(1000);
            if (!this.wasConnected) {
                this.wasConnected = true;
                this.emit('connected');
            }
            else {
                this.emit('reconnected');
            }
            callback && callback();
        });

        this.websocket.on('close', (code, reason) => {
            this.logger(this.ip + ': Websocket Close ' + code + ': ' + reason);
            this.websocket = null;
            this.errorCounter++;
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
            if (!this.stop) {
                let reconnectDelay = this.errorCounter * 5 + 5;
                if (reconnectDelay > 60) reconnectDelay = 60;
                this.logger(this.ip + ': Reconnect in ' + reconnectDelay + 's');
                this.reconnectTimeout = setTimeout(() => {
                    this.logger(this.ip + ': Reconnect ... (' + this.errorCounter + ')');
                    this.reconnectTimeout = null;
                    this.connect();
                }, reconnectDelay * 1000);
            }
            this.emit('closed', code, reason);
        });

        this.websocket.on('error', (error) => {
            this.logger(this.ip + ': Websocket Error: ' + error);
            if (this.websocket) {
                this.websocket.terminate();
            }
        });

        this.websocket.on('unexpected-response', (request, response) => {
            this.logger(this.ip + ': Websocket Unexpected Response: ' + response.statusCode + ' / ' + response.statusMessage);
            if (this.websocket) {
                this.websocket.terminate();
            }
        });

        this.websocket.on('message', (data) => {
            if (this.errorCounter > 1) {
                this.logger(this.ip + ': Message ' + data + ' resets ErrorCounter');
            }
            this.errorCounter = 0;

            let dataObj;
            try {
                dataObj = JSON.parse(data.toString());
            }
            catch (e) {
                this.emit('error', new Error('Error JSON: ' + e + ': ' + data));
                return;
            }

            this.logger(this.ip + ': RECEIVED ' + data.toString().trim());
            if (dataObj && dataObj.id && this.awaitingResponses[dataObj.id]) {
                if (this.awaitingResponses[dataObj.id].timeout) {
                    clearTimeout(this.awaitingResponses[dataObj.id].timeout);
                }
                this.awaitingResponses[dataObj.id].callback(null, dataObj.status, dataObj.data);
                delete this.awaitingResponses[dataObj.id];
            }
            else {
                this.emit('data', dataObj.status, dataObj.data, dataObj.command);
            }

        });
    }

    disconnect(force) {
        this.stop = true;
        if (!this.websocket) return;
        if (force) {
            this.websocket.terminate();
        }
        else {
            this.websocket.close();
        }
    }
}

module.exports = SiegeniaDevice;

