import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, UnknownContext } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { PumpAccessoryHandler } from './pumpAccessoryHandler';
import { HeaterAccessoryHandler } from './heaterAccessoryHandler';
import { SwgAccessoryHandler } from './swgAccessoryHandler';
import { MeadowPool, MeadowPoolStatus } from './MeadowPool';
import { TemperatureSensorAccessoryHandler } from './temperatureSensorAccessoryHandler';
import { FilterPressureAccessoryHandler } from './filterPressureAccessoryHandler';

export interface PoolMathAccessoryHandler {
	updateCharacteristics(refresh: boolean | false) : Promise<void>;
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class PoolMathAutomationControllerPlatform implements DynamicPlatformPlugin {
	public readonly Service: typeof Service = this.api.hap.Service;
	public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

	// this is used to track restored cached accessories
	public readonly accessories: PlatformAccessory[] = [];

	readonly accessoryHandlers: PoolMathAccessoryHandler[] = [];
	readonly controllers = new Map<string, MeadowPool>();

	readonly tag: string;

	constructor(
		public readonly log: Logger,
		public readonly config: PlatformConfig,
		public readonly api: API,
	) {
		this.tag = '[PoolMath]';

		this.log.debug(`${this.tag} Finished initializing platform`);

		// When this event is fired it means Homebridge has restored all cached accessories from disk.
		// Dynamic Platform plugins should only register new accessories after this event was fired,
		// in order to ensure they weren't added to homebridge already. This event can also be used
		// to start discovery of new accessories.
		this.api.on('didFinishLaunching', () => {
			this.log.debug(`${this.tag} DidFinishLaunching callback...`);
			// run the method to discover / register your devices as accessories
			this.discoverDevices();
		});
	}

	/**
	 * This function is invoked when homebridge restores cached accessories from disk at startup.
	 * It should be used to setup event handlers for characteristics and update respective values.
	 */
	configureAccessory(accessory: PlatformAccessory) {
		this.log.info(`${this.tag} Loading accessory from cache: ${accessory.displayName}`);

		// add the restored accessory to the accessories cache so we can track if it has already been registered
		this.accessories.push(accessory);
	}

	/**
	 * This is an example method showing how to register discovered accessories.
	 * Accessories must only be registered once, previously created accessories
	 * must not be registered again to prevent "duplicate UUID" errors.
	 */
	async discoverDevices() {

		const controllerConfigs = this.config.controllers;

		for (const controllerConfig of controllerConfigs) {
			const controllerKey = `${controllerConfig.address}:${controllerConfig.port}`;

			this.log.info(`${this.tag} Found configuration: ${controllerKey}`);

			if (!this.controllers.has(controllerKey)) {
				this.log.info(`${this.tag} Creating controller: ${controllerKey}`);
				this.controllers.set(controllerKey,
					new MeadowPool(controllerConfig.address, controllerConfig.port, controllerConfig.updateIntervalMs ?? 60000));
			}

			const controller = this.controllers.get(controllerKey) as MeadowPool;
			const newAccessories: PlatformAccessory<UnknownContext>[] = [];

			const pumpUuid = this.api.hap.uuid.generate(`${controller.address}:${controller.port}/pump`);
			const pumpAccessory = this.accessories.find(accessory => accessory.UUID === pumpUuid);

			if (pumpAccessory) {
				this.log.info(`${this.tag} Restored Pump Accessory: ${pumpAccessory.displayName} (${controllerKey})`);
				const pumpAccessoryHandler = new PumpAccessoryHandler(this, pumpAccessory, controller);
				this.accessoryHandlers.push(pumpAccessoryHandler);
			} else {
				const newPumpAccessory = new this.api.platformAccessory('Pump', pumpUuid);
				this.log.info(`${this.tag} Created Pump Accessory: ${newPumpAccessory.displayName} (${controllerKey})`);
				newAccessories.push(newPumpAccessory);
				const pumpAccessoryHandler = new PumpAccessoryHandler(this, newPumpAccessory, controller);
				this.accessoryHandlers.push(pumpAccessoryHandler);
			}

			const heaterUuid = this.api.hap.uuid.generate(`${controller.address}:${controller.port}/heater`);
			const heaterAccessory = this.accessories.find(accessory => accessory.UUID === heaterUuid);

			if (heaterAccessory) {
				this.log.info(`${this.tag} Restored Heater Accessory: ${heaterAccessory.displayName} (${controllerKey})`);
				const heaterAccessoryHandler = new HeaterAccessoryHandler(this, heaterAccessory, controller);
				this.accessoryHandlers.push(heaterAccessoryHandler);
			} else {
				const newHeaterAccessory = new this.api.platformAccessory('Heater', heaterUuid);
				this.log.info(`${this.tag} Created Heater Accessory: ${newHeaterAccessory.displayName} (${controllerKey})`);
				newAccessories.push(newHeaterAccessory);
				const heaterAccessoryHandler = new HeaterAccessoryHandler(this, newHeaterAccessory, controller);
				this.accessoryHandlers.push(heaterAccessoryHandler);
			}


			const temperatureUuid = this.api.hap.uuid.generate(`${controller.address}:${controller.port}/temperature`);
			const temperatureAccessory = this.accessories.find(accessory => accessory.UUID === temperatureUuid);

			if (temperatureAccessory) {
				this.log.info(`${this.tag} Restored Temperature Sensor Accessory: ${temperatureAccessory.displayName} (${controllerKey})`);
				const temperatureSensorAccessoryHandler = new TemperatureSensorAccessoryHandler(this, temperatureAccessory, controller);
				this.accessoryHandlers.push(temperatureSensorAccessoryHandler);
			} else {
				const newTemperatureSensorAccessory = new this.api.platformAccessory('Water Temperature', temperatureUuid);
				this.log.info(
					`${this.tag} Created Temperature Sensor Accessory: ${newTemperatureSensorAccessory.displayName} (${controllerKey})`);
				newAccessories.push(newTemperatureSensorAccessory);
				const temperatureSensorAccessoryHandler =
					new TemperatureSensorAccessoryHandler(this, newTemperatureSensorAccessory, controller);
				this.accessoryHandlers.push(temperatureSensorAccessoryHandler);
			}


			const filterPressureUuid = this.api.hap.uuid.generate(`${controller.address}:${controller.port}/filterpressuresensor`);
			const filterPressureAccessory = this.accessories.find(accessory => accessory.UUID === filterPressureUuid);

			if (filterPressureAccessory) {
				this.log.info(`${this.tag} Restored Filter Pressure Accessory: ${filterPressureAccessory.displayName} (${controllerKey})`);
				const filterPressureAccessoryHandler = new FilterPressureAccessoryHandler(this, filterPressureAccessory, controller);
				this.accessoryHandlers.push(filterPressureAccessoryHandler);
			} else {
				const newfilterPressureAccessory = new this.api.platformAccessory('Filter Pressure', filterPressureUuid);
				this.log.info(
					`${this.tag} Created Filter Pressure Accessory: ${newfilterPressureAccessory.displayName} (${controllerKey})`);
				newAccessories.push(newfilterPressureAccessory);
				const filterPressureAccessoryHandler =
					new FilterPressureAccessoryHandler(this, newfilterPressureAccessory, controller);
				this.accessoryHandlers.push(filterPressureAccessoryHandler);
			}


			const swgUuid = this.api.hap.uuid.generate(`${controller.address}:${controller.port}/swg`);
			const swgAccessory = this.accessories.find(accessory => accessory.UUID === swgUuid);

			if (swgAccessory) {
				this.log.info(`${this.tag} Restored SWG Accessory: ${swgAccessory.displayName} (${controllerKey})`);
				const swgAccessoryHandler = new SwgAccessoryHandler(this, swgAccessory, controller);
				this.accessoryHandlers.push(swgAccessoryHandler);
			} else {
				const newSwgAccessory = new this.api.platformAccessory('SWG', swgUuid);
				this.log.info(`${this.tag} Created SWG Accessory: ${newSwgAccessory.displayName} (${controllerKey})`);
				newAccessories.push(newSwgAccessory);
				const swgAccessoryHandler = new SwgAccessoryHandler(this, newSwgAccessory, controller);
				this.accessoryHandlers.push(swgAccessoryHandler);
			}

			// Do the initial state updates
			controller.updateStatus();

			if (newAccessories.length > 0) {
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, newAccessories);
			}

			controller.addListener('statusUpdated', (status: MeadowPoolStatus) => {
				const json = JSON.stringify(status);
				// eslint-disable-next-line max-len
				this.log.info(`${this.tag} Status: Temp=${status.Temp}, Pressure=${status.Pressure}, SWG=${status.SwgPercent} - ${status.SwgCycleTimeOn} (on) / ${status.SwgCycleTime} (current) / ${status.SwgCycleDuration} (cycle), Heater=${status.Heater}, Pump=${status.Pump}`);
				this.log.debug(`${this.tag} ${json}`);
				this.accessoryHandlers.forEach(h => {
					h.updateCharacteristics(false);
				});
			});

			this.log.info(`${this.tag} Initialized.`);
		}
	}
}
