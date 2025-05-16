import { Service, PlatformAccessory, CharacteristicValue, Nullable } from 'homebridge';
import { PoolMathAccessoryHandler, PoolMathAutomationControllerPlatform } from './platform';
import { MeadowPool } from './MeadowPool';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class ThermostatAccessoryHandler implements PoolMathAccessoryHandler {

	private minCelsius = 10;
	private maxCelsius = 38;

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
			.onGet(() => this.getCurrentTemperature());

		// Target Temperature
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
			.onGet(() => this.getTargetTemperature())
			.onSet(v => this.setTargetTemperature(v))
			.setProps({
				minStep: 0.5,
				minValue: this.minCelsius,
				maxValue: this.maxCelsius,
			});

		// Current Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
			.onGet(() => this.getCurrentHeatingCoolingState());

		// Target Heating/Cooling State
		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
			.onGet(() => this.getCurrentHeatingCoolingState())
			.onSet(v => this.setTargetHeatingCoolingState(v))
			.setProps({
				minValue: this.platform.Characteristic.TargetHeatingCoolingState.OFF,
				maxValue: this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
				validValues: [0, 1],
			});
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
		const targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
		const currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;

		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, targetTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, currentTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);
	}

	setTargetTemperature (value: CharacteristicValue) {

		const targetValue = this.clamp(<number>value.valueOf(), this.minCelsius, this.maxCelsius);

		// If turning on, then we just use the new heater state
		// the controller will turn the others off and report back that status
		// if turning 'off', then we assume heater state 0 is 'on'
		this.platform.log.info(`${this.tag} SET thermostatTarget=${targetValue}`);
		this.controller.setThermostatTarget(targetValue)
			.then(() => this.updateCharacteristics(false));
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setTargetHeatingCoolingState (value: CharacteristicValue) {
		this.platform.log.info(`${this.tag} Ignoring Target Heating State change, always HEAT`);
		this.updateCharacteristics(false);
	}

	getTargetTemperature () : Nullable<CharacteristicValue> {
		return this.formatTemperature(this.controller.status.ThermostatTarget);
	}

	getCurrentTemperature () : Nullable<CharacteristicValue> {
		return this.formatTemperature(this.controller.status.Temp);
	}

	getCurrentHeatingCoolingState () : Nullable<CharacteristicValue> {
		return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
	}

	// getTargetHeatingCoolingState () : Nullable<CharacteristicValue> {
	// 	return this.controller.status.Heating
	// 		? this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
	// 		: this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
	// }

	formatTemperature (value: number) : Nullable<CharacteristicValue> {
		return this.clamp(value, this.minCelsius, this.maxCelsius);
	}

	clamp (value: number, min: number, max: number) : number {
		return Math.min(max, Math.max(min, value));
	}

}
