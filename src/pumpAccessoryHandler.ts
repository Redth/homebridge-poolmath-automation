import { Service, PlatformAccessory, CharacteristicValue, Nullable } from 'homebridge';

import { PoolMathAutomationControllerPlatform } from './platform';

//import { Mutex } from 'async-mutex';
//import { ConsoleUtil } from './consoleUtil';
import { Poolduino } from './Poolduino';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

//const mutex = new Mutex();

export class PumpAccessoryHandler {

	private pumpProgram1Service: Service;
	private pumpProgram2Service: Service;
	private pumpProgram3Service: Service;

	readonly tag: string;

	constructor(
		private readonly platform: PoolMathAutomationControllerPlatform,
		private readonly accessory: PlatformAccessory,
		private readonly controller: Poolduino,
	) {

		this.tag = `[PoolMath(${controller.address}:${controller.port})][${accessory.displayName}]`;

		// set accessory information
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'TroubleFreePool')
			.setCharacteristic(this.platform.Characteristic.Model, 'Poolduino')
			.setCharacteristic(this.platform.Characteristic.SerialNumber, 'tfp-poolduino-1');

		// Pump 1
		const pumpProgram1ServiceName = 'High';
		this.pumpProgram1Service = this.accessory.getService(pumpProgram1ServiceName)
			|| this.accessory.addService(this.platform.Service.Fan, pumpProgram1ServiceName, 'PumpHigh');
		this.pumpProgram1Service.displayName = 'High';
		this.pumpProgram1Service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => this.setPumpProgram(v, 1))
			.onGet(() => this.getPumpProgram(this.pumpProgram1Service, 1));

		// Pump 2
		const pumpProgram2ServiceName = 'Low';
		this.pumpProgram2Service = this.accessory.getService(pumpProgram2ServiceName)
			|| this.accessory.addService(this.platform.Service.Fan, pumpProgram2ServiceName, 'PumpLow');
		this.pumpProgram2Service.displayName = 'Low';
		this.pumpProgram2Service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => this.setPumpProgram(v, 2))
			.onGet(() => this.getPumpProgram(this.pumpProgram2Service, 2));

		// Pump 3
		const pumpProgram3ServiceName = 'Medium';
		this.pumpProgram3Service = this.accessory.getService(pumpProgram3ServiceName)
			|| this.accessory.addService(this.platform.Service.Fan, pumpProgram3ServiceName, 'PumpMedium');
		this.pumpProgram3Service.displayName = 'Medium';
		this.pumpProgram3Service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => this.setPumpProgram(v, 3))
			.onGet(() => this.getPumpProgram(this.pumpProgram3Service, 3));
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const pump = this.controller.status.pumpProgram;
		this.pumpProgram1Service.updateCharacteristic(this.platform.Characteristic.On, pump === 1);
		this.pumpProgram2Service.updateCharacteristic(this.platform.Characteristic.On, pump === 2);
		this.pumpProgram3Service.updateCharacteristic(this.platform.Characteristic.On, pump === 3);
	}

	setPumpProgram (value: CharacteristicValue, pumpProgram: number) {
		const on = <boolean>value.valueOf();
		// If turning on, then we just use the new pump program
		// the controller will turn the others off and report back that status
		// if turning 'off', then we assume program mode 0 is 'on'
		const newPumpProgram = on ? pumpProgram : 0;
		this.platform.log.info(`${this.tag} SET pumpProgram=${newPumpProgram}`);
		this.controller.setPumpProgram(newPumpProgram)
			.then(() => this.updateCharacteristics(false));
	}

	getPumpProgram (pumpProgramService: Service, pumpProgram: number) : Nullable<CharacteristicValue> {
		return this.controller.status.pumpProgram === pumpProgram;
	}
}
