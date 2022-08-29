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

export class SwgAccessoryHandler {

	private swgService: Service;

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

		const swgServiceName = 'SWG';
		this.swgService = this.accessory.getService(swgServiceName)
			|| this.accessory.addService(this.platform.Service.Lightbulb, swgServiceName, 'SWG');
		this.swgService.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => {
				const on = <boolean>v.valueOf();

				let toSet = -1;
				if (on && this.controller.status.swgPercent <= 0) {
					toSet = (this.swgService.getCharacteristic(this.platform.Characteristic.Brightness)?.value as number) ?? 50;
				} else if (!on) {
					toSet = 0;
				}

				if (toSet >= 0) {
					this.platform.log.info(`${this.tag} SET swgPercent=${toSet} (On/Off)`);
					this.controller.setSwgPercent(toSet)
						.then(() => this.swgService.updateCharacteristic(this.platform.Characteristic.On, on));
				} else {
					this.swgService.updateCharacteristic(this.platform.Characteristic.On, v);
				}
			})
			.onGet(() => this.controller.status.swgPercent > 0);
		this.swgService.getCharacteristic(this.platform.Characteristic.Brightness)
			.onSet(v => {
				const toSet = (v.valueOf() as number) ?? 50;
				this.platform.log.info(`${this.tag} SET swgPercent=${toSet} (Brightness)`);
				this.controller.setSwgPercent(toSet)
					.then(() => this.swgService.updateCharacteristic(this.platform.Characteristic.Brightness, toSet));
			})
			.onGet(() => this.controller.status.swgPercent);
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const swgPercent = this.controller.status.swgPercent;
		this.swgService.updateCharacteristic(this.platform.Characteristic.Brightness, Math.max(0, swgPercent));
		this.swgService.updateCharacteristic(this.platform.Characteristic.On, swgPercent > 0);
	}
}
