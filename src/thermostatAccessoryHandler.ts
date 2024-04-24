import { Service, PlatformAccessory, CharacteristicValue, Nullable } from 'homebridge';
import { PoolMathAccessoryHandler, PoolMathAutomationControllerPlatform } from './platform';
import { MeadowPool } from './MeadowPool';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class ThermostatAccessoryHandler implements PoolMathAccessoryHandler {

	private thermostatService: Service;
	private displayInCelsius = true;

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
			.onGet(() => this.getCurrentTemperature());

		// Target Temperature
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
			.onGet(() => this.getTargetTemperature())
			.onSet(v => this.setTargetTemperature(v));

		// Temperature Display Units (always Fahrenheit)
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
			.onGet(() => this.getDisplayUnit())
			.onSet(v => this.setDisplayUnit(v));

		// Current Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
			.onGet(() => this.getCurrentHeatingCoolingState());

		// Target Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
			.onGet(() => this.getCurrentHeatingCoolingState())
			.onSet(v => this.setTargetHeatingCoolingState(v));
	}

	public async updateCharacteristics(refresh: boolean | false) {
		if (refresh) {
			await this.controller.updateStatus();
			const json = JSON.stringify(this.controller.status);
			this.platform.log.info(`${this.tag} Controller status updated`);
			this.platform.log.debug(`${this.tag} ${json}`);
		}

		const targetTemperature = this.getTargetTemperature() ?? 20;
		const currentTemperature = this.getCurrentTemperature() ?? 0;
		const targetHeatingCoolingState = this.getCurrentHeatingCoolingState()
			?? this.platform.Characteristic.TargetHeatingCoolingState.OFF;
		const currentHeatingCoolingState = this.getCurrentHeatingCoolingState()
			?? this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
		const displayUnit = this.getDisplayUnit()
			?? this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;

		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, targetTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, currentTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, displayUnit);
	}

	setTargetTemperature (value: CharacteristicValue) {

		const targetValue = this.formatTemperature(<number>value.valueOf(), 10, 38);
		// If turning on, then we just use the new heater state
		// the controller will turn the others off and report back that status
		// if turning 'off', then we assume heater state 0 is 'on'
		this.platform.log.info(`${this.tag} SET thermostatTarget=${targetValue}`);
		this.controller.setThermostatTarget(targetValue)
			.then(() => this.updateCharacteristics(false));
	}

	setTargetHeatingCoolingState (value: CharacteristicValue) {

		const targetStateValue = <number>value.valueOf();
		const isOn = targetStateValue === this.platform.Characteristic.TargetHeatingCoolingState.HEAT
			|| targetStateValue === this.platform.Characteristic.TargetHeatingCoolingState.AUTO;

		this.platform.log.info(`${this.tag} SET heaterOn=${isOn}`);
		this.controller.setHeaterOn(isOn)
			.then(() => this.updateCharacteristics(false));
	}

	getTargetTemperature () : Nullable<CharacteristicValue> {
		return this.formatTemperature(this.controller.status.ThermostatTarget, 10, 38);
	}

	getCurrentTemperature () : Nullable<CharacteristicValue> {
		return this.formatTemperature(this.controller.status.Temp, -270, 100);
	}

	getCurrentHeatingCoolingState () : Nullable<CharacteristicValue> {
		return this.controller.status.HeaterOn ?
			this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
			: this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
	}

	getDisplayUnit () : Nullable<CharacteristicValue> {
		if (this.displayInCelsius) {
			return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
		}

		return this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
	}

	setDisplayUnit (value: CharacteristicValue) {
		this.displayInCelsius = value === this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
	}

	formatTemperature (value: number, min: number, max: number) : number {
		const temp = Math.min(max, Math.max(min, value));

		// Convert to farenheit if needed
		// if (!celsius) {
		// 	temp = (temp * (9/5)) + 32;
		// }

		return Math.round(temp * 10) / 10;
	}
}
