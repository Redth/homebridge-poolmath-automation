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

export class HeaterAccessoryHandler implements PoolMathAccessoryHandler {

	private heaterState1Service: Service;
	private heaterState2Service: Service;

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

		// Heater Mode 1
		const heaterState1ServiceName = 'Pool';
		this.heaterState1Service = this.accessory.getService(heaterState1ServiceName)
			|| this.accessory.addService(this.platform.Service.Switch, heaterState1ServiceName, 'HeaterPool');
		this.heaterState1Service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => this.setHeaterState(v, 1))
			.onGet(() => this.getHeaterState(this.heaterState1Service, 1));

		// Heater Mode 2
		const heaterState2ServiceName = 'Spa';
		this.heaterState2Service = this.accessory.getService(heaterState2ServiceName)
			|| this.accessory.addService(this.platform.Service.Switch, heaterState2ServiceName, 'HeaterSpa');
		this.heaterState2Service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(v => this.setHeaterState(v, 2))
			.onGet(() => this.getHeaterState(this.heaterState2Service, 2));
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const heater = this.controller.status.Heater;
		this.heaterState1Service.updateCharacteristic(this.platform.Characteristic.On, heater === 1);
		this.heaterState2Service.updateCharacteristic(this.platform.Characteristic.On, heater === 2);
	}

	setHeaterState (value: CharacteristicValue, heaterState: number) {
		const on = <boolean>value.valueOf();
		const newHeaterState = on ? heaterState : 0;

		// If turning on, then we just use the new heater state
		// the controller will turn the others off and report back that status
		// if turning 'off', then we assume heater state 0 is 'on'
		this.platform.log.info(`${this.tag} SET heaterState=${newHeaterState}`);
		this.controller.setHeaterState(newHeaterState)
			.then(() => this.updateCharacteristics(false));
	}

	getHeaterState (heaterStateService: Service, heaterState: number) : Nullable<CharacteristicValue> {
		return this.controller.status.Heater === heaterState;
	}
}
