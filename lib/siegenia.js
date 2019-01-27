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
        this.websocket = null;

        this.requestId = 1;

        this.awaitingResponses = {};
        this.responseWaitTime = 20000; // TBD

        this.reconnectTimeout = null;
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
                if (this.awaitingResponses[reqId].callback) {
                    this.awaitingResponses[reqId].callback(new Error('Timeout'));
                }
                delete this.awaitingResponses[reqId];
            }, this.responseWaitTime);
        }

        console.log('SEND: ' + JSON.stringify(req));
        this.websocket.send(JSON.stringify(req));
    }

    loginUser(isAdmin, password, callback) {
        const req =  {
            'command': 'login',
            'user': isAdmin ? 'admin' : 'user',
            'password': 'pwassword',
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

        if (this.errorCounter > 5) {
            console.log('ErrorCounter > 5: STOP');
            return;
        }

        this.stop = false;
        this.websocket = new ws(this.wsProtocol + '://' + this.ip + ':' + this.port + '/WebSocket');

        this.websocket.on('open', () => {
            console.log('Websocket Open for Session, starting heartbeat');
            this.heartbeat(1000);
            this.emit('connected');
            callback && callback();
        });

        this.websocket.on('close', (code, reason) => {
            console.log('Websocket Close ' + code + ': ' + reason);
            this.websocket = null;
            this.errorCounter++;
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
            if (!this.stop) {
                const reconnectDelay = this.errorCounter <20 ? this.errorCounter * 30 : 600000;
                console.log('Reconnect in ' + reconnectDelay + 's');
                this.reconnectTimeout = setTimeout(() => {
                    console.log('Reconnect ... (' + this.errorCounter + ')');
                    this.reconnectTimeout = null;
                    this.connect();
                }, reconnectDelay);
            }
            this.emit('closed', code, reason);
        });

        this.websocket.on('error', (error) => {
            console.log('Websocket Error: ' + error);
            if (this.websocket) {
                this.websocket.terminate();
            }
        });

        this.websocket.on('unexpected-response', (request, response) => {
            console.log('Websocket Unexpected Response: ' + response.statusCode);
        });

        this.websocket.on('message', (data) => {
            if (this.errorCounter > 1) {
                console.log('Message ' + data + ' resets ErrorCounter');
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

