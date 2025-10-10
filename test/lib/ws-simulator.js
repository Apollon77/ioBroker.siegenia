'use strict';

const WebSocket = require('ws');

/**
 * Siegenia WebSocket Server Simulator
 * Simulates a Siegenia device WebSocket server for testing purposes
 */
class SiegeniaSimulator {
    /**
     * Creates a new simulator instance
     *
     * @param {object} [options] - Configuration options
     * @param {number} [options.port] - Port to listen on (default: 8080)
     * @param {number} [options.deviceType] - Device type (default: 5 = AEROVITAL)
     * @param {object} [options.customResponses] - Custom command responses
     */
    constructor(options) {
        options = options || {};
        this.port = options.port || 8080;
        this.deviceType = options.deviceType || 5;
        this.customResponses = options.customResponses || {};
        this.wss = null;
        this.clients = [];
    }

    /**
     * Starts the WebSocket server
     *
     * @returns {Promise<void>}
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.wss = new WebSocket.Server({ host: '127.0.0.1', port: this.port });

            this.wss.on('listening', () => {
                resolve();
            });

            this.wss.on('error', error => {
                reject(error);
            });

            this.wss.on('connection', ws => {
                this.clients.push(ws);

                ws.on('message', data => {
                    this.handleMessage(ws, data);
                });

                ws.on('close', () => {
                    const index = this.clients.indexOf(ws);
                    if (index > -1) {
                        this.clients.splice(index, 1);
                    }
                });
            });
        });
    }

    /**
     * Stops the WebSocket server
     *
     * @returns {Promise<void>}
     */
    async stop() {
        return new Promise(resolve => {
            if (!this.wss) {
                resolve();
                return;
            }

            // Close all client connections
            this.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            });
            this.clients = [];

            // Close the server
            this.wss.close(() => {
                this.wss = null;
                resolve();
            });
        });
    }

    /**
     * Handles incoming WebSocket messages
     *
     * @param {WebSocket} ws - The WebSocket connection
     * @param {Buffer} data - The message data
     */
    handleMessage(ws, data) {
        let dataObj;
        try {
            dataObj = JSON.parse(data.toString());
        } catch {
            return;
        }

        // Check for custom response first
        if (Object.prototype.hasOwnProperty.call(this.customResponses, dataObj.command)) {
            const customResponse = this.customResponses[dataObj.command];
            // If custom response is null, don't send any response (for timeout testing)
            if (customResponse === null) {
                return;
            }
            const res = {
                id: dataObj.id,
                status: customResponse.status || 'ok',
                data: customResponse.data,
            };
            ws.send(JSON.stringify(res));
            return;
        }

        // Default responses
        const res = {
            id: dataObj.id,
            status: 'ok',
        };

        switch (dataObj.command) {
            case 'keepAlive':
                // Standard response
                break;

            case 'login':
                res.data = {
                    token: 'test-token-12345',
                    user: dataObj.user || 'user',
                };
                break;

            case 'logout':
                res.status = 'unauthorized';
                break;

            case 'getDeviceState':
                res.data = {
                    deviceactive: true,
                };
                break;

            case 'getDevice':
                res.data = this.getDeviceInfo();
                break;

            case 'getDeviceParams':
                res.data = this.getDeviceParams();
                break;

            case 'getDeviceDetails':
                res.data = this.getDeviceDetails();
                break;

            case 'setDeviceParams': {
                // Send response
                ws.send(JSON.stringify(res));

                // Send update notification
                const updateRes = {
                    command: 'deviceParams',
                    data: dataObj.params,
                    status: 'update',
                };
                ws.send(JSON.stringify(updateRes));
                return;
            }

            case 'rebootDevice':
            case 'resetDevice':
            case 'renewCert':
                // Standard response
                break;

            default:
                res.status = 'error';
                res.data = { message: 'Unknown command' };
        }

        ws.send(JSON.stringify(res));
    }

    /**
     * Gets device information based on device type
     *
     * @returns {object} Device information
     */
    getDeviceInfo() {
        const deviceNames = {
            1: 'AEROPAC',
            2: 'AEROMAT VT',
            3: 'DRIVE axxent Family',
            4: 'SENSOAIR',
            5: 'AEROVITAL ambience',
            6: 'MHS Family',
            7: 'ACS',
            8: 'AEROTUBE',
            10: 'Universal Module',
            11: 'enOcean Converter Module',
            12: 'VT Upgrade',
            13: 'DRIVE CL',
            14: 'AEROPLUS',
        };

        return {
            adminpwinit: false,
            devicefloor: 'EG',
            devicelocation: 'Test Room',
            devicename: `${deviceNames[this.deviceType] || 'Unknown'} Test Device`,
            hardwareversion: '1.0',
            initialized: true,
            serialnr: 'TEST000001',
            softwareversion: '1.8.1',
            subvariant: 0,
            type: this.deviceType,
            userpwinit: true,
            variant: 0,
        };
    }

    /**
     * Gets device parameters based on device type
     *
     * @returns {object} Device parameters
     */
    getDeviceParams() {
        const baseParams = {
            warnings: [],
            airbase: {
                temperature: {
                    indoor: 22,
                    outdoor: 6,
                },
                humidity: {
                    indoor: 67,
                    outdoor: 20,
                },
            },
            airquality: 5,
        };

        // Add type-specific parameters
        if ([5, 8, 14].includes(this.deviceType)) {
            // AEROVITAL, AEROTUBE, AEROPLUS
            return {
                ...baseParams,
                fanpower: 70,
                fanmode: 'OUT',
                maxfanpower: 1000,
                automode_maxairflow: 80,
                automode_co2sensity: 50,
                lighting: {
                    front: '29C257',
                    back: '29C257',
                    history: ['123456', '345678'],
                    front_auto: true,
                    back_auto: false,
                    front_enabled: true,
                    back_enabled: false,
                },
                clock: {
                    hour: 17,
                    minute: 23,
                    year: 2019,
                    month: 1,
                    day: 27,
                },
                timer: {
                    activetimer: 2,
                    timer_valid: 128,
                    remainingtime: {
                        hour: 5,
                        minute: 23,
                    },
                    poweron_time: {
                        hour: 20,
                        minute: 0,
                    },
                },
                list_timers: [
                    {
                        timer_id: 1,
                        enabled: true,
                        duration: {
                            hour: 18,
                            minute: 59,
                        },
                        poweron_weekday: 4,
                        poweron_time: {
                            hour: 15,
                            minute: 0,
                        },
                        fanpower: 70,
                        fanmode: 'IN',
                    },
                ],
            };
        } else if (this.deviceType === 1) {
            // AEROPAC
            return {
                ...baseParams,
                fanlevel: 3,
                timer: {
                    duration: {
                        hour: 1,
                        minute: 0,
                    },
                    enabled: false,
                    poweron_time: {
                        hour: 16,
                        minute: 40,
                    },
                    remainingtime: {
                        hour: 0,
                        minute: 0,
                    },
                    repeat: true,
                },
            };
        }

        return baseParams;
    }

    /**
     * Gets device details
     *
     * @returns {object} Device details
     */
    getDeviceDetails() {
        return {
            airfilterremainingterm: 178,
            debug_value: 'UNAVAILABLE',
            hardwareversion: '1.0',
            ip: '127.0.0.1',
            mac: 'c4:93:00:07:3f:c6',
            operatinghours: 409,
            serialnr: 'TEST000001',
            softwareversion: '1.8.1',
        };
    }

    /**
     * Sets a custom response for a specific command
     *
     * @param {string} command - The command name
     * @param {object} response - The response data
     * @param {string} [response.status] - Response status (default: 'ok')
     * @param {object} [response.data] - Response data
     */
    setCustomResponse(command, response) {
        this.customResponses[command] = response;
    }

    /**
     * Clears custom response for a command
     *
     * @param {string} command - The command name
     */
    clearCustomResponse(command) {
        delete this.customResponses[command];
    }

    /**
     * Changes the device type
     *
     * @param {number} deviceType - The new device type
     */
    setDeviceType(deviceType) {
        this.deviceType = deviceType;
    }

    /**
     * Sends a push notification to all connected clients
     *
     * @param {string} command - The command/event name
     * @param {object} data - The data to send
     * @param {string} [status] - The status (default: 'update')
     */
    sendPushNotification(command, data, status) {
        status = status || 'update';
        const message = JSON.stringify({
            command,
            data,
            status,
        });

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

module.exports = SiegeniaSimulator;
