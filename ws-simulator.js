const WebSocket = require('ws');

const wss = new WebSocket.Server({ host: '127.0.0.1', port: 8080 });

wss.on('connection', ws => {
    console.log('CONNECTION RECEIVED!');

    ws.on('message', function incoming(data) {
        console.log('received: %s', data);

        let dataObj;
        try {
            dataObj = JSON.parse(data.toString());
        } catch (e) {
            console.log(`Error JSON: ${e}: ${data}`);
            return;
        }

        const res = {
            id: dataObj.id,
            status: 'ok',
        };

        if (dataObj.command === 'keepAlive') {
            // res standard
        } else if (dataObj.command === 'login') {
            res.data = {
                token: 'a-token-here',
                user: 'whatever',
            };
        } else if (dataObj.command === 'logout') {
            // res standard
            res.status = 'unauthorized';
        } else if (dataObj.command === 'getDeviceState') {
            res.data = {
                deviceactive: true,
            };
        } else if (dataObj.command === 'setDeviceParams') {
            // res standard
        } else if (dataObj.command === 'resetDevice') {
            // res standard
        } else if (dataObj.command === 'rebootDevice') {
            // res standard
        } else if (dataObj.command === 'renewCert') {
            // res standard
        } else if (dataObj.command === 'getDevice') {
            res.data = {
                adminpwinit: false,
                devicefloor: 'EG',
                devicelocation: 'Wohnzimmer',
                devicename: 'AEROVITAL ambience 555555',
                hardwareversion: '1.0',
                initialized: true,
                serialnr: 'aa000011',
                softwareversion: '1.2.6',
                subvariant: 0,
                type: 5,
                userpwinit: true,
                variant: 0,
            };
        } else if (dataObj.command === 'getDeviceParams') {
            /*res.data = {
                'clock': {
                    'hour': 0,
                    'minute': 0
                },
                'devicefloor': 'EG',
                'devicelocation': 'Wohnzimmer',
                'devicename': 'AEROPAC 555555',
                'fanlevel': 0,
                'timer': {
                    'duration': {
                        'hour': 1,
                        'minute': 0
                    },
                    'enabled': false,
                    'poweron_time': {
                        'hour': 16,
                        'minute': 40},
                    'remainingtime': {
                        'hour': 0,
                        'minute': 0
                    },
                    'repeat':true
                },
                'warnings': []
            };*/
            res.data = {
                warnings: ['Warning1', 'Warning2'],
                fanpower: 70,
                fanmode: 'OUT',
                maxfanpower: 1000,
                automode: true,
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
        } else if (dataObj.command === 'getDeviceDetails') {
            res.data = {
                airfilterremainingterm: 178,
                debug_value: 'UNAVAILABLE',
                hardwareversion: '1.0',
                ip: '192.168.1.25',
                mac: 'c4:93:00:07:3f:c6',
                operatinghours: 409,
                serialnr: 'aa000011',
                softwareversion: '1.2.6',
            };
        }

        if (res) {
            ws.send(JSON.stringify(res));
        }

        if (dataObj.command === 'setDeviceParams') {
            const addRes = {
                command: 'deviceParams',
                data: {
                    devicestate: {
                        deviceactive: true,
                    },
                    fanpower: 70,
                },
                status: 'update',
            };
            ws.send(JSON.stringify(addRes));
        }
    });
});
