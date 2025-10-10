// List of defined device types
const DeviceTypeMap = {
    1: 'AEROPAC',
    2: 'AEROMAT VT',
    3: 'DRIVE axxent Family',
    4: 'SENSOAIR',
    5: 'AEROVITAL',
    6: 'MHS Family',
    7: 'ACS',
    8: 'AEROTUBE',
    9: 'GENIUS B', // (obsolete – GENIUS B is now controlled by the Universal Module)
    10: 'Universal Module',
    11: 'enOcean Converter Module',
    12: 'VT Upgrade',
    13: 'DRIVE CL',
    14: 'AEROPLUS',
};

const deviceSpecialObjects = {
    3: {
        // DRIVE axxent Family, Seite 20
        openclose: {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: { 1: 'OPEN', 2: 'CLOSE', 3: 'OPEN_TO_TURN' },
            native: {
                handleAsString: true,
                states: { 1: 'OPEN', 2: 'CLOSE', 3: 'OPEN_TO_TURN' },
            },
        },
        stop: { read: false, write: true, type: 'boolean', role: 'button.stop' },
    },
    5: {
        // AEROVITAL ambience
        // Timer-delete und so ??? TODO
        'timer.fanpower': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            unit: '%',
            min: 0,
            max: 100,
        },
        'timer.fanmode': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG', 5: 'AUTO' },
            native: {
                handleAsString: true,
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG', 5: 'AUTO' },
            },
        },
    },
    6: {
        // MHS Family
        'sash-0.openclose': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: {
                1: 'OPEN',
                2: 'GAP_VENT',
                3: 'STOP_OVER',
                4: 'CLOSE',
                5: 'CLOSE_WO_LOCK',
            },
            native: {
                handleAsString: true,
                realId: 'openclose.0',
                states: {
                    1: 'OPEN',
                    2: 'GAP_VENT',
                    3: 'STOP_OVER',
                    4: 'CLOSE',
                    5: 'CLOSE_WO_LOCK',
                },
            },
        },
        'sash-1.openclose': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: {
                1: 'OPEN',
                2: 'GAP_VENT',
                3: 'STOP_OVER',
                4: 'CLOSE',
                5: 'CLOSE_WO_LOCK',
            },
            native: {
                handleAsString: true,
                realId: 'openclose.1',
                states: {
                    1: 'OPEN',
                    2: 'GAP_VENT',
                    3: 'STOP_OVER',
                    4: 'CLOSE',
                    5: 'CLOSE_WO_LOCK',
                },
            },
        },
        'sash-0.stop': {
            read: false,
            write: true,
            type: 'boolean',
            role: 'button.stop',
            native: { realId: 'stop.0' },
        },
        'sash-1.stop': {
            read: false,
            write: true,
            type: 'boolean',
            role: 'button.stop',
            native: { realId: 'stop.1' },
        },
    },
    8: {
        // AEROTUBE
        // Timer-delete und so ??? TODO
        'timer.fanpower': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            unit: '%',
            min: 0,
            max: 100,
        },
        'timer.fanmode': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG', 5: 'AUTO' },
            native: {
                handleAsString: true,
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG', 5: 'AUTO' },
            },
        },
        'timer.duration': {
            type: 'value',
            role: 'state',
            native: { handleAsTimehhmm: true, maxHour: 18 },
        },
    },
    12: {
        // VT Upgrade
        'timer.fanpower': {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            unit: '%',
            min: 0,
            max: 100,
        },
        'timer.duration': {
            read: false,
            write: true,
            type: 'string',
            role: 'value',
            native: { handleAsTimehhmm: true, maxHour: 24 },
        },
    },
    13: {
        // DRIVE CL
        openclose: {
            read: false,
            write: true,
            type: 'number',
            role: 'level',
            states: {
                1: 'LOCKED_WING_CLOSED',
                2: 'TURN_POS_OPENED',
                3: 'TURN_POS_CLOSED',
                4: 'GAP_VENT',
                5: 'TILT_POS',
                6: 'CLOSED_NOT_LOCKED',
            },
            native: {
                handleAsString: true,
                states: {
                    1: 'LOCKED_WING_CLOSED',
                    2: 'TURN_POS_OPENED',
                    3: 'TURN_POS_CLOSED',
                    4: 'GAP_VENT',
                    5: 'TILT_POS',
                    6: 'CLOSED_NOT_LOCKED',
                },
            },
        },
        stop: { read: false, write: true, type: 'boolean', role: 'button.stop' },
    },
};

const fieldMap = {
    getDevice: {
        all: { read: true, write: false },
        type: { type: 'number', states: DeviceTypeMap },
    },
    getDeviceState: {
        deviceactive: {
            id: 'active',
            type: 'boolean',
            read: true,
            write: true,
            def: false,
            native: { realId: 'devicestate.deviceactive' },
        },
    },
    getDeviceParams: {
        all: { read: true, write: true },
        // Definitions that work for all relevant devices
        'devicestate.deviceactive': {
            id: 'active',
            type: 'boolean',
            read: true,
            write: true,
            def: false,
            native: { realId: 'devicestate.deviceactive' },
        },
        warnings: { type: 'array', write: false },
        'airbase.temperature.indoor': {
            type: 'number',
            role: 'value.temperature',
            unit: '◦C',
            write: false,
        },
        'airbase.temperature.outdoor': {
            type: 'number',
            role: 'value.temperature',
            unit: '◦C',
            write: false,
        },
        'airbase.humidity.indoor': {
            type: 'number',
            role: 'value.humidity',
            unit: '%',
            write: false,
        },
        'airbase.humidity.outdoor': {
            type: 'number',
            role: 'value.humidity',
            unit: '%',
            write: false,
        },
        airquality: { type: 'number', role: 'value', write: false },

        // Definitions that only work for defined deviceTypes
        1: {
            // AEROPAC
            fanlevel: { type: 'number', min: 0, max: 7 },
            'timer.duration': {
                type: 'value',
                native: { handleAsTimehhmm: true, maxHour: 18 },
            },
            'timer.remainingtime': { type: 'value', write: false },
            'timer.poweron_time': {
                type: 'value',
                native: { handleAsTimehhmm: true },
            },
            clock: { ignore: true },
        },
        2: {
            // AEROMAT VT
            fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            maxfanpower: { type: 'number', role: 'level', unit: 'm3/h', min: 0 },
            'airquality.co2content': {
                type: 'number',
                role: 'value.co2',
                unit: 'PPM',
                write: false,
            },
            'airquality.voc': { type: 'number', role: 'value', write: false },
        },
        3: {
            // DRIVE axxent DK/MH
            state: { write: false }, // TODO!! DRIVE axxent DK/MH Seite 20 - CHECK!!
            'timer.duration': { type: 'value', native: { handleAsTimehhmm: true } },
            'timer.remainingtime': { type: 'value', write: false },
        },
        4: {
            // SENSOAIR
            externaldevices: { type: 'object', write: false }, // TODO SENSOAIR - ?? Seite 21
        },
        5: {
            // AEROVITAL ambience
            fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            fanmode: {
                type: 'number',
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG' },
                native: { handleAsString: true },
            },
            maxfanpower: {
                type: 'number',
                role: 'value',
                unit: 'm3/h',
                write: false,
            },
            automode_maxairflow: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            automode_co2sensity: {
                type: 'number',
                role: 'level',
                unit: '%',
                min: 0,
                max: 100,
            },
            'lighting.front': {
                type: 'string',
                role: 'level.color.rgb',
                native: { handleAsColor: true },
            },
            'lighting.back': {
                type: 'string',
                role: 'level.color.rgb',
                native: { handleAsColor: true },
            },
            'lighting.history': { type: 'array', write: false },
            clock: { ignore: true },
            'timer.activetimer': { write: false },
            'timer.remainingtime': { write: false },
            'timer.poweron_time': { write: false },
            list_timers: { type: 'object', write: false }, // TODO Seite 22
        },
        6: {
            // MHS Family
            'states.0': { id: 'sash-0.state', write: false, type: 'string' },
            'states.1': { id: 'sash-1.state', write: false, type: 'string' },
            max_stopover: { unit: 'dm', write: false },
            stopover: { unit: 'dm' },
            'timer.duration': {
                type: 'value',
                native: { handleAsTimehhmm: true, maxHour: 4 },
            },
            'timer.remainingtime': { type: 'value', write: false },
        },
        8: {
            // AEROTUBE
            fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            fanmode: {
                type: 'number',
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'AUTO' },
                native: { handleAsString: true },
            },
            fanmirror: {
                type: 'number',
                states: {
                    0: 'Slave mode',
                    1: 'Slave must mirror',
                    2: 'Slave must copy',
                },
            },
            slave_fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            slave_fandirection: {
                type: 'number',
                states: { 1: 'Slave supply air', 2: 'Slave exhaust air' },
            },
            maxfanpower: {
                type: 'number',
                role: 'value',
                unit: 'm3/h',
                write: false,
            },
            automode_maxairflow: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            automode_co2sensity: {
                type: 'number',
                role: 'level',
                unit: '%',
                min: 0,
                max: 100,
            },
            bathcontrolfanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            bathcontrolmodeactive: {
                type: 'number',
                states: { 1: 'IN', 2: 'OUT', 3: 'IGNORE' },
                native: { handleAsString: true },
            },
            bathcontrolmodepassive: {
                type: 'number',
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'AUTO' },
                native: { handleAsString: true },
            },
            clock: { ignore: true },
            ecomode_maxairflow: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            externaldevices: { type: 'object', write: false }, // TODO Seite 26
            'timer.activetimer': { write: false },
            'timer.remainingtime': { write: false },
            'timer.poweron_time': { write: false },
            list_timers: { type: 'object', write: false }, // TODO Seite 22
        },
        10: {
            // Universal Module
            fanmode: {
                type: 'number',
                states: { 1: 'OPEN', 2: 'CLOSED' },
                write: false,
            },
        },
        11: {
            // enOcean Converter Module
            windowsensors: { type: 'array', role: 'list', write: false },
            alarmtype: {
                type: 'number',
                role: 'value',
                states: { 1: 'SILENT', 2: 'ACOUSTIC', 3: 'OPTICAL', 4: 'BOTH' },
                native: { handleAsString: true },
            },
            alarmsens: {
                type: 'number',
                role: 'value',
                states: { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' },
                native: { handleAsString: true },
            },
            'alarm.active': { type: 'boolean', role: 'indicator.alarm', write: false },
            'alarm.sensorid': { type: 'number', role: 'value', write: false },
            'statistics.opencount': { type: 'number', role: 'value', write: false },
            'statistics.calibration': { type: 'number', role: 'value', write: false },
            'statistics.teach': { type: 'number', role: 'value', write: false },
            'statistics.tilt': { type: 'number', role: 'value', write: false },
            'statistics.turn': { type: 'number', role: 'value', write: false },
        },
        12: {
            // VT Upgrade
            fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            maxfanpower: {
                type: 'number',
                role: 'value',
                unit: 'm3/h',
                write: false,
            },
            automode: { type: 'boolean', role: 'switch.mode.auto' },
            'airbase.temperature.indoor': {
                type: 'number',
                role: 'value.temperature',
                unit: '°C',
                write: false,
            },
            'airbase.humidity.indoor': {
                type: 'number',
                role: 'value.humidity',
                unit: '%',
                write: false,
            },
            'airquality.voc': { type: 'number', role: 'value', unit: 'VOC', write: false },
            clock: { ignore: true },
            'timer.activetimer': { type: 'number', role: 'value', write: false },
            'timer.remainingtime': { type: 'string', role: 'value', write: false },
            'timer.poweron_time': { type: 'string', role: 'value', write: false },
            list_timers: { type: 'object', role: 'list', write: false },
        },
        13: {
            // DRIVE CL
            state: {
                type: 'string',
                role: 'text',
                write: false,
                states: {
                    1: 'LOCKED_WING_CLOSED',
                    2: 'TURN_POS_OPENED',
                    3: 'TURN_POS_CLOSED',
                    4: 'GAP_VENT',
                    5: 'TILT_POS',
                    6: 'CLOSED_NOT_LOCKED',
                    7: 'UNKNOWN',
                    8: 'POSITIONING',
                    9: 'ERROR_TILT_SENSOR',
                    10: 'ERROR_MOTOR',
                    11: 'ERROR_WINDOW_OPEN',
                    12: 'WINDOW_OPEN_TILT_BLOCKED',
                    13: 'WINDOW_OPEN_TURN_BLOCKED',
                    14: 'ERROR_CALIBRATION',
                },
            },
            silentmode: { type: 'boolean', role: 'switch.mode.silent' },
            autolock: { type: 'boolean', role: 'switch.lock' },
            holidaymode: { type: 'boolean', role: 'switch.mode' },
            tiltfunction: {
                type: 'number',
                role: 'level',
                min: 1,
                max: 6,
            },
            'timer.duration': {
                type: 'string',
                role: 'value',
                native: { handleAsTimehhmm: true, maxHour: 4 },
            },
            'timer.remainingtime': { type: 'string', role: 'value', write: false },
        },
        14: {
            // AEROPLUS
            fanpower: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            fanmode: {
                type: 'number',
                states: { 1: 'IN', 2: 'OUT', 3: 'IN_OUT', 4: 'IN_OUT_WRG', 5: 'AUTO' },
                native: { handleAsString: true },
            },
            maxfanpower: {
                type: 'number',
                role: 'value',
                unit: 'm3/h',
                write: false,
            },
            automode_maxairflow: {
                type: 'number',
                role: 'level.valve',
                unit: '%',
                min: 0,
                max: 100,
            },
            automode_co2sensity: {
                type: 'number',
                role: 'level',
                unit: '%',
                min: 0,
                max: 100,
            },
            'airquality.co2content': {
                type: 'number',
                role: 'value.co2',
                unit: 'PPM',
                write: false,
            },
            'airquality.voc': { type: 'number', role: 'value', write: false },
            clock: { ignore: true },
            'timer.activetimer': { write: false },
            'timer.remainingtime': { write: false },
            'timer.poweron_time': { write: false },
            list_timers: { type: 'object', write: false },
        },
    },
};

/**
 * Converts a number into a two-digit number string, prepending 0 if needed
 *
 * @param {number} val - The number to convert
 * @returns {string} A zero-padded two-digit string
 */
function _00(val) {
    let s = val.toString();
    while (s.length < 2) {
        s = `0${s}`;
    }
    return s;
}

/**
 * Converts object structure into a point separated flat list of key-values
 *
 * @param {object} data - The data object to flatten
 * @param {string} [prefix] - Prefix to prepend to each key
 * @param {object} [fields] - Accumulator object for flattened fields
 * @returns {object} The flattened object structure
 */
function flattenFieldNames(data, prefix, fields) {
    if (!data || typeof data !== 'object') {
        return fields;
    }
    if (!prefix) {
        prefix = '';
    }
    if (!fields) {
        fields = {};
    }

    if (
        data['hour'] !== undefined &&
        data['minute'] !== undefined &&
        data['year'] !== undefined &&
        data['month'] !== undefined &&
        data['day'] !== undefined
    ) {
        fields[prefix] = new Date(data['year'], data['month'] + 1, data['day'], data['hour'], data['minute']).getTime();
        return fields;
    } else if (data['hour'] !== undefined && data['minute'] !== undefined) {
        fields[prefix] = `${_00(data['hour'])}:${_00(data['minute'])}`;
        if (data['second'] !== undefined) {
            fields[prefix] += `:${_00(data['second'])}`;
        } else {
            fields[prefix] += ':00';
        }
        return fields;
    }

    for (const key in data) {
        if (!Object.hasOwn(data, key)) {
            continue;
        }

        if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
            fields = flattenFieldNames(data[key], (prefix.length ? `${prefix}.` : prefix) + key, fields);
        } else {
            fields[(prefix.length ? `${prefix}.` : prefix) + key] = data[key];
        }
    }
    return fields;
}

/**
 * Maps device data to ioBroker object definitions based on command and device type.
 *
 * @param {string} command - The command that produced the data
 * @param {string} deviceType - The type of device
 * @param {object} data - The raw data from the device
 * @returns {object} Object definitions for ioBroker states
 */
function mapToObjects(command, deviceType, data) {
    const objs = {};
    const fields = flattenFieldNames(data);
    for (let key in fields) {
        if (!Object.hasOwn(fields, key)) {
            continue;
        }
        let obj = {};
        if (fieldMap[command]) {
            if (fieldMap[command].all) {
                obj = Object.assign(obj, fieldMap[command].all);
            }
            if (fieldMap[command][key]) {
                obj = Object.assign(obj, fieldMap[command][key]);
            }
            if (fieldMap[command][deviceType] && fieldMap[command][deviceType][key]) {
                obj = Object.assign(obj, fieldMap[command][deviceType][key]);
            }
        }
        if (obj.ignore) {
            continue;
        }

        const value = fields[key];
        if (!obj.native) {
            obj.native = {};
        }
        if (obj.id) {
            if (!obj.native.realId) {
                obj.native.realId = key;
            }
            key = obj.id;
            delete obj.id;
        }
        obj.value = mapValueForRead(value, obj);
        if (obj.states) {
            obj.native.states = obj.states;
        }

        // Try to set roles
        if (!obj.role) {
            let role = '';
            if (!obj.type) {
                obj.type = typeof obj.value;
            }
            if (obj.type === 'boolean') {
                if (obj.read && !obj.write) {
                    // Boolean, read-only --> Sensor OR Indicator!
                    role = 'sensor';
                } else if (obj.write && !obj.read) {
                    // Boolean, write-only --> Button
                    role = 'button';
                } else if (obj.read && obj.write) {
                    // Boolean, read-write --> Switch
                    role = 'switch';
                }
            } else if (obj.type === 'number') {
                if (obj.read && !obj.write) {
                    // Number, read-only --> Value
                    role = 'value';
                } else if (obj.write && !obj.read) {
                    // Boolean, write-only --> ?? Level?
                    role = 'level';
                } else if (obj.read && obj.write) {
                    // Number, read-write --> Level
                    role = 'level';
                }
            } else if (obj.type === 'string') {
                role = 'text';
            }

            if (role !== '') {
                obj.role = role;
            }

            if (!obj.role) {
                obj.role = 'state';
            }
            console.log(`add role for ${key} = ${obj.role}`);
        }

        objs[key] = obj;
    }
    return objs;
}

/**
 * Maps device data to state values for updating ioBroker states.
 *
 * @param {string} command - The command that produced the data
 * @param {string} deviceType - The type of device
 * @param {object} data - The raw data from the device
 * @returns {object} State values mapped to ioBroker state IDs
 */
function mapToStates(command, deviceType, data) {
    const fields = flattenFieldNames(data);
    for (const key in fields) {
        if (!Object.hasOwn(fields, key)) {
            continue;
        }
        if (fieldMap[command]) {
            let value = fields[key];
            let finalKey = key;
            if (fieldMap[command][deviceType] && fieldMap[command][deviceType][key]) {
                if (fieldMap[command][deviceType][key].id) {
                    finalKey = fieldMap[command][deviceType][key].id;
                }
                value = mapValueForRead(value, fieldMap[command][deviceType][key]);
            } else if (fieldMap[command][key]) {
                if (fieldMap[command][key].id) {
                    finalKey = fieldMap[command][key].id;
                }
                value = mapValueForRead(value, fieldMap[command][key]);
            }

            if (key !== finalKey) {
                delete fields[key];
            }
            fields[finalKey] = value;
        }
    }
    return fields;
}

function mapValueForRead(value, def) {
    if (!def || !def.native) {
        return value;
    }
    if (def.native.handleAsColor) {
        if (!value.startsWith('#')) {
            value = `#${value}`;
        }
    } else if (def.native.handleAsString && def.states) {
        for (const key in def.states) {
            if (!Object.hasOwn(def.states, key)) {
                continue;
            }
            if (def.states[key] === value) {
                value = key;
                break;
            }
        }
    }
    // handleAsDateTime, handleAsTimehhmm and handleAsTimehhmmss are auto detected while parsing
    return value;
}

/**
 * Transforms a state value before writing it to the device.
 *
 * @param {string} name - The state name
 * @param {any} value - The value to write
 * @param {object} native - Native object configuration
 * @returns {object} The transformed value wrapped in a params object
 */
function mapValueForWrite(name, value, native) {
    if (native && native.handleAsColor) {
        if (value.startsWith('#')) {
            value = value.substr(1);
        }
    } else if (native && native.handleAsString && native.states) {
        if (native.states[value]) {
            value = native.states[value];
        }
    } else if (native && native.handleAsDateTime) {
        const valDate = new Date(value);
        value = {
            year: valDate.getFullYear(),
            month: valDate.getMonth() + 1,
            day: valDate.getDate(),
            hour: valDate.getHours(),
            minute: valDate.getMinutes(),
        };
    } else if (native && (native.handleAsTimehhmm || native.handleAsTimehhmmss)) {
        const valArr = value.split(':');
        if (valArr.length < 2 || valArr.length > 3) {
            return {};
        }
        value = {
            hour: parseInt(valArr[0], 10),
            minute: parseInt(valArr[1], 10),
        };
        if (native.handleAsTimehhmmss && valArr.length === 3) {
            value.second = parseInt(valArr[2], 10);
        }
    }
    if (native && native.realId) {
        name = native.realId;
    }
    const nameArr = name.split('.');
    let res;
    let currObj = value;
    for (let i = nameArr.length - 1; i >= 0; i--) {
        res = {};
        res[nameArr[i]] = currObj;
        currObj = res;
    }
    return res;
}

/**
 * Returns special device-specific object definitions for a given device type.
 *
 * @param {string} deviceType - The type of device
 * @returns {object} Device-specific object definitions
 */
function getSpecialDeviceObjects(deviceType) {
    return deviceSpecialObjects[deviceType];
}

module.exports = {
    mapToObjects: mapToObjects,
    mapToStates: mapToStates,
    mapValueForWrite: mapValueForWrite,
    getSpecialDeviceObjects: getSpecialDeviceObjects,
    DeviceTypeMap: DeviceTypeMap,
};
