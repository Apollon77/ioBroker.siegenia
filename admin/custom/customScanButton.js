import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

class CustomScanButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            scanning: false
        };
    }

    handleScan = async () => {
        this.setState({ scanning: true });
        
        try {
            const result = await this.props.socket.sendTo(
                `${this.props.adapterName}.${this.props.instance}`,
                'discover',
                {}
            );
            
            if (result && Array.isArray(result)) {
                const currentDevices = this.props.data.devices || [];
                let added = 0;
                
                for (const newDevice of result) {
                    const exists = currentDevices.find(d => d.ip === newDevice.ip);
                    if (!exists) {
                        currentDevices.push(newDevice);
                        added++;
                    }
                }
                
                if (added > 0) {
                    this.props.onChange('devices', currentDevices);
                    this.props.showToast(
                        I18n.t('Found %s devices. Added %s new devices.', result.length, added)
                    );
                } else if (result.length > 0) {
                    this.props.showToast(
                        I18n.t('Found %s devices. Nothing new.', result.length)
                    );
                } else {
                    this.props.showToast(I18n.t('No devices found'));
                }
            } else {
                this.props.showToast(I18n.t('No devices found'));
            }
        } catch (error) {
            console.error('Scan error:', error);
            this.props.showToast(I18n.t('Scan failed'));
        } finally {
            this.setState({ scanning: false });
        }
    };

    render() {
        return (
            <div style={{ marginTop: 8 }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={this.state.scanning ? <CircularProgress size={20} /> : <SearchIcon />}
                    onClick={this.handleScan}
                    disabled={this.state.scanning}
                >
                    {I18n.t('Scan for devices')}
                </Button>
                <div style={{ marginTop: 4, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                    {I18n.t('The scan will take approx 5s ...')}
                </div>
            </div>
        );
    }
}

export default CustomScanButton;
