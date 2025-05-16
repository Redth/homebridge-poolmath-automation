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
	private minFahrenheit = 50;
	private maxFahrenheit = 100;

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
			.onSet(v => this.setTargetTemperature(v))
			.setProps({
				minStep: this.displayInCelsius ? 0.5 : 1,
				minValue: this.displayInCelsius ? this.minCelsius : this.minFahrenheit,
				maxValue: this.displayInCelsius ? this.maxCelsius : this.maxFahrenheit,
			});

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
		const displayUnit = this.getDisplayUnit()
			?? this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
		const targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
		const currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;

		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, targetTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, currentTemperature);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);
		this.thermostatService.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, displayUnit);
	}

	setTargetTemperature (value: CharacteristicValue) {

		let targetValue = this.clamp(<number>value.valueOf(),
			this.displayInCelsius ? this.minCelsius : this.minFahrenheit,
			this.displayInCelsius ? this.maxCelsius : this.maxFahrenheit);

		// If display is set to farenheit, convert to celsius
		if (!this.displayInCelsius) {
			// Convert to Celsius if needed
			targetValue = this.farenheitToCelsius(targetValue);
		}

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
		return this.formatTemperature(this.controller.status.ThermostatTarget, this.displayInCelsius);
	}

	getCurrentTemperature () : Nullable<CharacteristicValue> {
		return this.formatTemperature(this.controller.status.Temp, this.displayInCelsius);
	}

	getCurrentHeatingCoolingState () : Nullable<CharacteristicValue> {
		return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
	}

	getDisplayUnit () : Nullable<CharacteristicValue> {
		if (this.displayInCelsius) {
			return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
		}

		return this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
	}

	setDisplayUnit (value: CharacteristicValue) {
		this.displayInCelsius = value === this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
		this.platform.log.info(`${this.tag} SET displayUnit=${this.displayInCelsius ? 'C' : 'F'}`);


		this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
			.setProps({
				minStep: this.displayInCelsius ? 0.5 : 1,
				minValue: this.displayInCelsius ? this.minCelsius : this.minFahrenheit,
				maxValue: this.displayInCelsius ? this.maxCelsius : this.maxFahrenheit,
			});
		this.updateCharacteristics(false);
	}

	formatTemperature (value: number, celsius: boolean) : number {
		let temp = value;

		// Convert to Farenheit if needed
		if (!celsius) {
			temp = this.celsiusToFarenheit(temp);
		}

		const min = celsius ? this.minCelsius : this.minFahrenheit;
		const max = celsius ? this.maxCelsius : this.maxFahrenheit;

		// Clamp to min/max
		temp = this.clamp(temp, min, max);

		return Math.round(temp * 10) / 10;
	}

	clamp (value: number, min: number, max: number) : number {
		return Math.min(max, Math.max(min, value));
	}

	farenheitToCelsius(value: number) : number {
		return (value - 32) * (5/9);
	}

	celsiusToFarenheit(value: number) : number {
		return (value * (9/5)) + 32;
	}
}
