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

export class ThermostatAccessoryHandler implements PoolMathAccessoryHandler {

	private thermostatService: Service;

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

		// Thermostat
		const thermostatServiceName = 'Thermostat';
		this.thermostatService = this.accessory.getService(thermostatServiceName)
			|| this.accessory.addService(this.platform.Service.Thermostat, thermostatServiceName, 'ThermostatPool');

		// Current Temperature
		this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
			.onGet(() => this.getThermostatCurrent());

		// Target Temperature
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
			.onGet(() => this.getThermostatTarget())
			.onSet(v => this.setThermostatTarget(v));

		// Temperature Display Units (always Fahrenheit)
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
			.onGet(() => this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.onSet(_ => this.updateCharacteristics(false));

		// Current Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
			.onGet(() => this.getThermostatHeatingCoolingState());

		// Target Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
			.onGet(() => this.platform.Characteristic.TargetHeatingCoolingState.HEAT)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.onSet(_ => this.updateCharacteristics(false));
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const targetTemperature = this.getThermostatTarget();
		const currentTemperature = this.getThermostatCurrent();
		const targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
		const currentHeatingCoolingState = this.getThermostatHeatingCoolingState();

		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, targetTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, currentTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits,
			this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
	}

	setThermostatTarget (value: CharacteristicValue) {

		const targetValue = <number>value.valueOf();

		// If turning on, then we just use the new heater state
		// the controller will turn the others off and report back that status
		// if turning 'off', then we assume heater state 0 is 'on'
		this.platform.log.info(`${this.tag} SET thermostatTarget=${targetValue}`);
		this.controller.setThermostatTarget(targetValue)
			.then(() => this.updateCharacteristics(false));
	}

	getThermostatTarget () : Nullable<CharacteristicValue> {
		return this.controller.status.ThermostatTarget;
	}

	getThermostatCurrent () : Nullable<CharacteristicValue> {
		return this.controller.status.Temp;
	}

	getThermostatHeatingCoolingState () : Nullable<CharacteristicValue> {
		return this.controller.status.Heater <= 0
			? this.platform.Characteristic.CurrentHeatingCoolingState.OFF
			: this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
	}
}
