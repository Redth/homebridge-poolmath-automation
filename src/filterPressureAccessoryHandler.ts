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

export class FilterPressureAccessoryHandler implements PoolMathAccessoryHandler {

	private filterPressureService: Service;

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
		const filterPressureServiceName = 'Filter Pressure';
		this.filterPressureService = this.accessory.getService(filterPressureServiceName)
			|| this.accessory.addService(this.platform.Service.HumiditySensor, filterPressureServiceName, 'FilterPressurePool');
		this.filterPressureService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
			.onGet(() => this.getFilterPressure());
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const pressure = this.controller.status.Pressure;
		this.filterPressureService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, pressure);
	}

	getFilterPressure () : Nullable<CharacteristicValue> {
		return this.controller.status.Pressure;
	}
}
