import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, UnknownContext } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { PumpAccessoryHandler } from './pumpAccessoryHandler';
import { HeaterAccessoryHandler } from './heaterAccessoryHandler';
import { SwgAccessoryHandler } from './swgAccessoryHandler';
import { Poolduino } from './Poolduino';


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

	readonly accessoryHandlers: any[] = [];
	readonly controllers = new Map<string, Poolduino>();

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
				this.controllers.set(controllerKey, new Poolduino(controllerConfig.address, controllerConfig.port));
			}

			const controller = this.controllers.get(controllerKey) as Poolduino;
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
			controller.updateStatus().then(() => {
				const json = JSON.stringify(controller.status);
				this.log.info(`${this.tag} Controller status updated`);
				this.log.debug(`${this.tag} ${json}`);
				this.accessoryHandlers.forEach(h => {
					h.updateCharacteristics(false);
				});
			});

			if (newAccessories.length > 0) {
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, newAccessories);
			}

			this.log.info(`${this.tag} Initialized.`);
		}
	}
}
