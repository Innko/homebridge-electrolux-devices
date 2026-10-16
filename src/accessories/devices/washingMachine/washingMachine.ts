import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { ElectroluxDevicesPlatform } from '../../../platform';
import { ElectroluxAccessoryController } from '../../controller';
import { Appliance } from '../../../definitions/appliance';
import { ApplianceState } from '../../../definitions/applianceState';
import { ApplianceItem } from '../../../definitions/appliances';

export class WashingMachine extends ElectroluxAccessoryController {
    private valveService: Service;
    private contactSensorService: Service;

    constructor(
        readonly _platform: ElectroluxDevicesPlatform,
        readonly _accessory: PlatformAccessory<ElectroluxAccessoryController>,
        readonly _item: ApplianceItem,
        readonly _state: ApplianceState,
        readonly _appliance: Appliance
    ) {
        super(_platform, _accessory, _item, _state, _appliance);

        this.accessory
            .getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(
                this.platform.Characteristic.Manufacturer,
                'Electrolux'
            )
            .setCharacteristic(
                this.platform.Characteristic.Model,
                this.appliance.applianceInfo?.model ?? 'Washing Machine'
            )
            .setCharacteristic(
                this.platform.Characteristic.SerialNumber,
                this.item.applianceId
            );

        // Valve service — used to represent the wash cycle (Active + InUse + RemainingDuration)
        this.valveService =
            this.accessory.getService(this.platform.Service.Valve) ||
            this.accessory.addService(this.platform.Service.Valve);

        this.valveService.setCharacteristic(
            this.platform.Characteristic.Name,
            this.item.applianceName ?? 'Washing Machine'
        );

        this.valveService.setCharacteristic(
            this.platform.Characteristic.ValveType,
            this.platform.Characteristic.ValveType.WATER_FAUCET
        );

        this.valveService
            .getCharacteristic(this.platform.Characteristic.Active)
            .onGet(this.getCharacteristicValueGuard(this.getActive.bind(this)))
            .onSet(this.setCharacteristicValueGuard(this.setActive.bind(this)));

        this.valveService
            .getCharacteristic(this.platform.Characteristic.InUse)
            .onGet(this.getCharacteristicValueGuard(this.getInUse.bind(this)));

        this.valveService
            .getCharacteristic(this.platform.Characteristic.RemainingDuration)
            .onGet(
                this.getCharacteristicValueGuard(
                    this.getRemainingDuration.bind(this)
                )
            );

        // Contact sensor — OPEN when door is unlocked (cycle done), CLOSED when door is locked (running)
        this.contactSensorService =
            this.accessory.getService(this.platform.Service.ContactSensor) ||
            this.accessory.addService(this.platform.Service.ContactSensor);

        this.contactSensorService.setCharacteristic(
            this.platform.Characteristic.Name,
            'Door'
        );

        this.contactSensorService
            .getCharacteristic(this.platform.Characteristic.ContactSensorState)
            .onGet(
                this.getCharacteristicValueGuard(
                    this.getContactSensorState.bind(this)
                )
            );
    }

    async getActive(): Promise<CharacteristicValue> {
        return this.state.properties.reported.applianceState === 'RUNNING'
            ? this.platform.Characteristic.Active.ACTIVE
            : this.platform.Characteristic.Active.INACTIVE;
    }

    async setActive(value: CharacteristicValue) {
        const command =
            value === this.platform.Characteristic.Active.ACTIVE
                ? { executeCommand: 'START' }
                : { executeCommand: 'STOP_PAUSE' };

        await this.sendCommand(command);
        this.state.properties.reported.applianceState =
            value === this.platform.Characteristic.Active.ACTIVE
                ? 'RUNNING'
                : 'READY_TO_START';
    }

    async getInUse(): Promise<CharacteristicValue> {
        return this.state.properties.reported.applianceState === 'RUNNING'
            ? this.platform.Characteristic.InUse.IN_USE
            : this.platform.Characteristic.InUse.NOT_IN_USE;
    }

    async getRemainingDuration(): Promise<CharacteristicValue> {
        const timeToEnd = this.state.properties.reported.timeToEnd ?? 0;
        // API returns seconds; HomeKit max is 3600s, so clamp
        return Math.max(0, Math.min(timeToEnd, 3600));
    }

    async getContactSensorState(): Promise<CharacteristicValue> {
        // Door locked = washing in progress = sensor CLOSED (no alert)
        // Door unlocked = cycle done = sensor OPEN (triggers notification)
        return this.state.properties.reported.doorLock === 'ON'
            ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
            : this.platform.Characteristic.ContactSensorState
                  .CONTACT_NOT_DETECTED;
    }

    async update(state: ApplianceState) {
        this.state = state;

        const isRunning =
            this.state.properties.reported.applianceState === 'RUNNING';

        this.valveService.updateCharacteristic(
            this.platform.Characteristic.Active,
            isRunning
                ? this.platform.Characteristic.Active.ACTIVE
                : this.platform.Characteristic.Active.INACTIVE
        );

        this.valveService.updateCharacteristic(
            this.platform.Characteristic.InUse,
            isRunning
                ? this.platform.Characteristic.InUse.IN_USE
                : this.platform.Characteristic.InUse.NOT_IN_USE
        );

        this.valveService.updateCharacteristic(
            this.platform.Characteristic.RemainingDuration,
            await this.getRemainingDuration()
        );

        this.contactSensorService.updateCharacteristic(
            this.platform.Characteristic.ContactSensorState,
            await this.getContactSensorState()
        );
    }
}
