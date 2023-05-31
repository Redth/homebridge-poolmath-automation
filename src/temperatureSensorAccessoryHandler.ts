import { Service, PlatformAccessory, CharacteristicValue, Nullable } from 'homebridge';

import { PoolMathAccessoryHandler, PoolMathAutomationControllerPlatform } from './platform';

//import { Mutex } from 'async-mutex';
//import { ConsoleUtil } from './consoleUtil';
import { MeadowPool } from './MeadowPool';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

//const mutex = new Mutex();

export class TemperatureSensorAccessoryHandler implements PoolMathAccessoryHandler {

	private temperatureSensorService: Service;

	readonly tag: string;

	constructor(
		private readonly platform: PoolMathAutomationControllerPlatform,
		private readonly accessory: PlatformAccessory,
		private readonly controller: MeadowPool,
	) {
		this.tag = `[PoolMath(${controller.address}:${controller.port})][${accessory.displayName}]`;

		// set accessory information
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'TroubleFreePool')
			.setCharacteristic(this.platform.Characteristic.Model, 'MeadowPool')
			.setCharacteristic(this.platform.Characteristic.SerialNumber, 'tfp-MeadowPool-1');

		// Temp sensor
		const temperatureSensorServiceName = 'Water Temperature';
		this.temperatureSensorService = this.accessory.getService(temperatureSensorServiceName)
			|| this.accessory.addService(this.platform.Service.TemperatureSensor, temperatureSensorServiceName, 'TemperatureSensorPool');
		this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
			.onGet(() => this.getTemperature());
		this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.StatusActive).onGet(() => true);
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const temp = this.controller.status.Temp;
		this.temperatureSensorService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, temp);
		this.temperatureSensorService.updateCharacteristic(this.platform.Characteristic.StatusActive, true);
	}

	getTemperature () : Nullable<CharacteristicValue> {
		return this.controller.status.Temp;
	}
}
