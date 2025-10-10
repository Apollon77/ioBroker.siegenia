'use strict';

const { expect } = require('chai');
const SiegeniaDevice = require('../../lib/siegenia');
const SiegeniaSimulator = require('../lib/ws-simulator');

describe('SiegeniaDevice Unit Tests', function () {
    this.timeout(10000);

    let simulator;
    let device;
    const TEST_PORT = 8081;

    before(async function () {
        this.timeout(5000);
        simulator = new SiegeniaSimulator({ port: TEST_PORT, deviceType: 5 });
        await simulator.start();
    });

    after(async function () {
        this.timeout(5000);
        if (simulator) {
            await simulator.stop();
        }
    });

    afterEach(function () {
        if (device) {
            device.disconnect(true);
            device = null;
        }
    });

    describe('Connection Management', function () {
        it('should connect successfully', function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                expect(device.websocket).to.exist;
                expect(device.wasConnected).to.be.true;
                done();
            });

            device.on('error', err => {
                done(err);
            });

            device.connect();
        });

        it('should emit closed event on disconnect', function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                device.disconnect();
            });

            device.on('closed', code => {
                expect(code).to.exist;
                done();
            });

            device.on('error', err => {
                done(err);
            });

            device.connect();
        });

        it('should handle connection to non-existent server', function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: 9999, // Non-existent port
            });

            device.on('closed', () => {
                // Connection should close
                done();
            });

            device.on('error', () => {
                // Errors are expected
            });

            device.connect();
        });
    });

    describe('Authentication', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should login with username and password', function (done) {
            device.loginUser('testuser', 'testpass', (err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.token).to.exist;
                expect(data.user).to.equal('testuser');
                done();
            });
        });

        it('should login with token', function (done) {
            device.loginToken('my-test-token', (err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.token).to.exist;
                done();
            });
        });

        it('should logout successfully', function (done) {
            device.logout((err, status) => {
                expect(err).to.not.exist;
                expect(status).to.equal('unauthorized');
                done();
            });
        });
    });

    describe('Device Information', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should get device info', function (done) {
            device.getDeviceInfo((err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.type).to.equal(5); // AEROVITAL
                expect(data.devicename).to.exist;
                expect(data.serialnr).to.exist;
                expect(data.softwareversion).to.exist;
                done();
            });
        });

        it('should get device state', function (done) {
            device.getDeviceState((err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.deviceactive).to.be.a('boolean');
                done();
            });
        });

        it('should get device parameters', function (done) {
            device.getDeviceParams((err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.fanpower).to.exist;
                expect(data.fanmode).to.exist;
                expect(data.airbase).to.exist;
                expect(data.airbase.temperature).to.exist;
                expect(data.airbase.humidity).to.exist;
                done();
            });
        });

        it('should get device details', function (done) {
            device.getDeviceDetails((err, status, data) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                expect(data).to.exist;
                expect(data.serialnr).to.exist;
                expect(data.softwareversion).to.exist;
                expect(data.mac).to.exist;
                expect(data.ip).to.exist;
                done();
            });
        });
    });

    describe('Device Control', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should set device parameters', function (done) {
            const params = {
                fanpower: 80,
            };

            device.setDeviceParams(params, (err, status) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                done();
            });
        });

        it('should emit data event on parameter update', function (done) {
            device.on('data', (status, data, command) => {
                expect(status).to.equal('update');
                expect(command).to.equal('deviceParams');
                expect(data).to.exist;
                done();
            });

            device.setDeviceParams({ fanpower: 80 }, () => {
                // Response callback
            });
        });

        it('should reboot device', function (done) {
            device.rebootDevice((err, status) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                done();
            });
        });

        it('should reset device', function (done) {
            device.resetDevice((err, status) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                done();
            });
        });

        it('should renew certificate', function (done) {
            device.renewCert((err, status) => {
                expect(err).to.not.exist;
                expect(status).to.equal('ok');
                done();
            });
        });
    });

    describe('Heartbeat', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should send keepAlive messages', function (done) {
            this.timeout(3000);

            let keepAliveCount = 0;
            const originalSend = device.websocket.send.bind(device.websocket);

            device.websocket.send = function (data) {
                const parsed = JSON.parse(data);
                if (parsed.command === 'keepAlive') {
                    keepAliveCount++;
                    if (keepAliveCount >= 1) {
                        device.websocket.send = originalSend;
                        done();
                        return;
                    }
                }
                originalSend(data);
            };
        });

        it('should handle keepAlive errors', function (done) {
            simulator.setCustomResponse('keepAlive', {
                status: 'error',
                data: { message: 'Test error' },
            });

            device.on('error', err => {
                expect(err).to.exist;
                expect(err.message).to.include('heartbeat');
                simulator.clearCustomResponse('keepAlive');
                done();
            });

            // Trigger heartbeat
            device.heartbeat(100);
        });
    });

    describe('Request Timeout', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.responseWaitTime = 500; // Short timeout for testing

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should timeout if no response received', function (done) {
            this.timeout(2000);

            // Set simulator to not respond to this command
            simulator.setCustomResponse('getDevice', null);

            device.getDeviceInfo((err, _status, _data) => {
                expect(err).to.exist;
                expect(err.message).to.include('Timeout');
                simulator.clearCustomResponse('getDevice');
                done();
            });
        });
    });

    describe('Error Handling', function () {
        beforeEach(function (done) {
            device = new SiegeniaDevice({
                wsProtocol: 'ws',
                ip: '127.0.0.1',
                port: TEST_PORT,
            });

            device.on('connected', () => {
                done();
            });

            device.connect();
        });

        it('should handle error responses from device', function (done) {
            simulator.setCustomResponse('getDevice', {
                status: 'error',
                data: { message: 'Test error' },
            });

            device.getDeviceInfo((err, _status, _data) => {
                expect(err).to.not.exist;
                expect(_status).to.equal('error');
                simulator.clearCustomResponse('getDevice');
                done();
            });
        });

        it('should handle invalid JSON from device', function (done) {
            // This test verifies the device handles invalid JSON gracefully
            device.on('error', err => {
                expect(err).to.exist;
                done();
            });

            // Send invalid JSON directly
            if (device.websocket) {
                device.websocket.emit('message', Buffer.from('invalid json {]'));
            }
        });
    });
});
