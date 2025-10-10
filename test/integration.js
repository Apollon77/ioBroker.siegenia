const path = require('path');
const { tests } = require('@iobroker/testing');
const { expect } = require('chai');
const SiegeniaSimulator = require('./lib/ws-simulator');

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Integration Tests with WebSocket Simulator', getHarness => {
            let simulator;
            const TEST_PORT = 8082;

            // Start simulator and configure adapter before all tests
            before(async function () {
                this.timeout(30000);

                // Start the simulator first
                simulator = new SiegeniaSimulator({ port: TEST_PORT, deviceType: 5 });
                await simulator.start();

                const harness = getHarness();

                // Configure adapter with test device BEFORE starting it
                // Note: changeAdapterConfig updates the "native" section
                await harness.changeAdapterConfig('siegenia', {
                    native: {
                        devices: [
                            {
                                ip: '127.0.0.1',
                                port: TEST_PORT,
                                wsProtocol: 'ws',
                                name: 'Test Device',
                                user: 'testuser',
                                password: 'testpass',
                            },
                        ],
                    },
                });

                // Start adapter and wait for it to be alive
                await harness.startAdapterAndWait();

                // Give adapter time to initialize the device
                await new Promise(resolve => setTimeout(resolve, 3000));
            });

            // Stop simulator after all tests
            after(async function () {
                this.timeout(10000);
                if (simulator) {
                    await simulator.stop();
                }
            });

            it('Should start the adapter with test device', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Verify adapter is running
                const state = await harness.states.getStateAsync('system.adapter.siegenia.0.alive');
                expect(state).to.exist;
                expect(state.val).to.be.true;
            });

            it('Should create device object with correct structure', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check if device object exists
                const deviceObj = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1');
                expect(deviceObj).to.exist;
                expect(deviceObj.type).to.equal('device');
                expect(deviceObj.common.name).to.equal('Test Device');
                expect(deviceObj.native.ip).to.equal('127.0.0.1');
            });

            it('Should create online state', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check online state object
                const onlineObj = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.online');
                expect(onlineObj).to.exist;
                expect(onlineObj.type).to.equal('state');
                expect(onlineObj.common.role).to.equal('indicator.reachable');

                // Check online state value
                const onlineState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.online');
                expect(onlineState).to.exist;
                expect(onlineState.val).to.be.true;
            });

            it('Should create lastStatus state', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check lastStatus state object
                const lastStatusObj = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.lastStatus');
                expect(lastStatusObj).to.exist;
                expect(lastStatusObj.type).to.equal('state');
                expect(lastStatusObj.common.role).to.equal('text');

                // Check lastStatus state exists
                const lastStatusState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.lastStatus');
                expect(lastStatusState).to.exist;
            });

            it('Should create info channel with device information', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check info channel
                const infoChannel = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.info');
                expect(infoChannel).to.exist;
                expect(infoChannel.type).to.equal('channel');

                // Check device name state
                const deviceNameState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.info.devicename');
                expect(deviceNameState).to.exist;
                expect(deviceNameState.val).to.include('AEROVITAL');

                // Check serial number state
                const serialNrState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.info.serialnr');
                expect(serialNrState).to.exist;
                expect(serialNrState.val).to.equal('TEST000001');

                // Check device type state
                const typeState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.info.type');
                expect(typeState).to.exist;
                expect(typeState.val).to.equal(5); // AEROVITAL
            });

            it('Should create params channel with device parameters', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check params channel
                const paramsChannel = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.params');
                expect(paramsChannel).to.exist;
                expect(paramsChannel.type).to.equal('channel');

                // Check deviceactive state (mapped to "active")
                const deviceActiveState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.params.active');
                expect(deviceActiveState).to.exist;
                expect(deviceActiveState.val).to.be.a('boolean');

                // Check fanpower state
                const fanpowerState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.params.fanpower');
                expect(fanpowerState).to.exist;
                expect(fanpowerState.val).to.be.a('number');

                // Check fanmode state
                const fanmodeState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.params.fanmode');
                expect(fanmodeState).to.exist;
                expect(fanmodeState.val).to.be.a('string');

                // Check temperature states (nested structure)
                const tempIndoorState = await harness.states.getStateAsync(
                    'siegenia.0.127_0_0_1.params.airbase.temperature.indoor',
                );
                expect(tempIndoorState).to.exist;
                expect(tempIndoorState.val).to.be.a('number');

                const tempOutdoorState = await harness.states.getStateAsync(
                    'siegenia.0.127_0_0_1.params.airbase.temperature.outdoor',
                );
                expect(tempOutdoorState).to.exist;
                expect(tempOutdoorState.val).to.be.a('number');

                // Check humidity states (nested structure)
                const humidityIndoorState = await harness.states.getStateAsync(
                    'siegenia.0.127_0_0_1.params.airbase.humidity.indoor',
                );
                expect(humidityIndoorState).to.exist;
                expect(humidityIndoorState.val).to.be.a('number');
            });

            it('Should create details channel with device details', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check details channel
                const detailsChannel = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.details');
                expect(detailsChannel).to.exist;
                expect(detailsChannel.type).to.equal('channel');

                // Check MAC address state
                const macState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.details.mac');
                expect(macState).to.exist;
                expect(macState.val).to.be.a('string');

                // Check IP address state
                const ipState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.details.ip');
                expect(ipState).to.exist;
                expect(ipState.val).to.equal('127.0.0.1');

                // Check operating hours state
                const operatingHoursState = await harness.states.getStateAsync(
                    'siegenia.0.127_0_0_1.details.operatinghours',
                );
                expect(operatingHoursState).to.exist;
                expect(operatingHoursState.val).to.be.a('number');
            });

            it('Should create reboot button state', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Check reboot state object
                const rebootObj = await harness.objects.getObjectAsync('siegenia.0.127_0_0_1.reboot');
                expect(rebootObj).to.exist;
                expect(rebootObj.type).to.equal('state');
                expect(rebootObj.common.role).to.equal('button');
                expect(rebootObj.common.write).to.be.true;
                expect(rebootObj.common.read).to.be.false;
            });

            it('Should update state when fanpower is changed', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Set new fanpower value
                await harness.states.setStateAsync('siegenia.0.127_0_0_1.params.fanpower', 90, false);

                // Give time for the update to propagate
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Check if state was updated (should receive update from device)
                const fanpowerState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.params.fanpower');
                expect(fanpowerState).to.exist;
                // The state should be acknowledged after the device confirms
                expect(fanpowerState.ack).to.be.true;
            });

            it('Should handle device disconnect', async function () {
                this.timeout(10000);

                const harness = getHarness();

                // Verify device is currently online
                const onlineStateBefore = await harness.states.getStateAsync('siegenia.0.127_0_0_1.online');
                expect(onlineStateBefore).to.exist;
                expect(onlineStateBefore.val).to.be.true;

                // Stop the simulator to simulate device disconnect
                await simulator.stop();

                // Give time for the disconnect to be detected (adapter checks heartbeat)
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check online state should be false
                const onlineStateDisconnected = await harness.states.getStateAsync('siegenia.0.127_0_0_1.online');
                expect(onlineStateDisconnected).to.exist;
                expect(onlineStateDisconnected.val).to.be.false;

                // Restart simulator for cleanup
                await simulator.start();
            });
        });

        suite('Integration Tests with Different Device Types', getHarness => {
            let simulator;
            const TEST_PORT_TYPE1 = 8083;

            it('Should handle AEROPAC device (type 1) correctly', async function () {
                this.timeout(30000);

                // Start simulator with device type 1 (AEROPAC)
                simulator = new SiegeniaSimulator({ port: TEST_PORT_TYPE1, deviceType: 1 });
                await simulator.start();

                const harness = getHarness();

                // Configure adapter with AEROPAC device
                await harness.changeAdapterConfig('siegenia', {
                    native: {
                        devices: [
                            {
                                ip: '127.0.0.1',
                                port: TEST_PORT_TYPE1,
                                wsProtocol: 'ws',
                                name: 'AEROPAC Test Device',
                                user: 'testuser',
                                password: 'testpass',
                            },
                        ],
                    },
                });

                // Start adapter and wait
                await harness.startAdapterAndWait();

                // Give adapter time to initialize
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check device type
                const typeState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.info.type');
                expect(typeState).to.exist;
                expect(typeState.val).to.equal(1); // AEROPAC

                // Check AEROPAC-specific parameter (fanlevel instead of fanpower)
                const fanlevelState = await harness.states.getStateAsync('siegenia.0.127_0_0_1.params.fanlevel');
                expect(fanlevelState).to.exist;
                expect(fanlevelState.val).to.be.a('number');

                // Stop simulator
                await simulator.stop();
                simulator = null;
            });

            afterEach(async function () {
                this.timeout(10000);
                if (simulator) {
                    await simulator.stop();
                    simulator = null;
                }
            });
        });
    },
});
