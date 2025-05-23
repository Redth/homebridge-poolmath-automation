import axios from 'axios';
import { debounce } from 'ts-debounce';
import { EventEmitter } from 'events';
import { MeadowPoolStatus } from './MeadowPoolStatus';
import { Logger } from 'homebridge';

export class MeadowPool extends EventEmitter {
	constructor(
		public readonly log: Logger,
		public readonly address: string,
		public readonly port: number,
		public readonly updateIntervalMs: number,
		public readonly pumpMode1Label: string,
		public readonly pumpMode2Label: string,
		public readonly pumpMode3Label: string) {

		super();

		this.baseUrl = 'http://' + this.address + ':' + this.port;

		this.status = new MeadowPoolStatus(address, port, false, 0, 0, 0, Date.now(), 0, 0, 0, 0, 100, '');

		// Update from the endpoint regularly
		setInterval(async () => {
			await this.updateStatus();
		}, updateIntervalMs);
	}

	readonly baseUrl: string;

	public status: MeadowPoolStatus;


	setStatus(status:MeadowPoolStatus) {
		// if they're already equal, no-op
		if (JSON.stringify(this.status) === JSON.stringify(status)) {
			return;
		}

		this.status = status;

		this.emit('statusUpdated', this.status);
	}

	readonly debouncedUpdateStatus = debounce(this.updateStatusInternal, 2000);
	async updateStatus() {
		return await this.debouncedUpdateStatus();
	}

	async updateStatusInternal() {
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/status');
			this.setStatus(resp.data);
		} catch (e) {
			this.log.error('Failed updateStatus: ' + e);
		}
	}

	readonly debouncedSetPumpProgramInternal = debounce(this.setPumpProgramInternal, 1200);
	public async setPumpProgram(pumpProgram: number) {
		return await this.debouncedSetPumpProgramInternal(pumpProgram);
	}

	async setPumpProgramInternal(pumpProgram: number ) {
		const previousPumpProgram = this.status.Pump;

		this.status.Pump = pumpProgram;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/pump/' + pumpProgram);
			this.setStatus(resp.data);
		} catch (e) {
			this.status.Pump = previousPumpProgram;
			this.setStatus(this.status);
			this.log.error('Failed setPumpProgram: ' + e);
		}
	}

	readonly debouncedSetSwgPercentInternal = debounce(this.setSwgPercentInternal, 1200);

	public async setSwgPercent(swgPercent: number) {
		return await this.debouncedSetSwgPercentInternal(swgPercent);
	}

	async setSwgPercentInternal(swgPercent: number) {
		const previousSwgPercent = this.status.SwgPercent;

		this.status.SwgPercent = swgPercent;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/swg/' + swgPercent);
			this.setStatus(resp.data);
		} catch (e) {
			this.status.SwgPercent = previousSwgPercent;
			this.setStatus(this.status);
			this.log.error('Failed setSwgPercent: ' + e);
		}
	}



	readonly debouncedSetThermostatTargetInternal = debounce(this.setThermostatTargetInternal, 1200);

	public async setThermostatTarget(targetValue: number) {
		return await this.debouncedSetThermostatTargetInternal(targetValue);
	}

	async setThermostatTargetInternal(targetValue: number) {
		const previousThermostatTarget = this.status.ThermostatTarget;

		this.status.ThermostatTarget = targetValue;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/thermostat/' + targetValue);
			this.setStatus(resp.data);
		} catch (e) {
			this.status.ThermostatTarget = previousThermostatTarget;
			this.setStatus(this.status);
			this.log.error('Failed setThermostatTarget: ' + e);
		}
	}

	// readonly debouncedSetHeaterOnInternal = debounce(this.setHeaterOnInternal, 1200);
	// public async setHeaterOn(heaterOn: boolean) {
	// 	return await this.debouncedSetHeaterOnInternal(heaterOn);
	// }

	// async setHeaterOnInternal(heaterOn: boolean) {
	// 	const previousHeaterState = this.status.HeaterOn;

	// 	this.status.Heating = heaterOn;
	// 	try {
	// 		const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/heater/' + heaterOn);
	// 		this.setStatus(resp.data);
	// 	} catch (e) {
	// 		this.status.HeaterOn = previousHeaterState;
	// 		this.setStatus(this.status);
	// 		this.log.error('Failed setHeaterOn: ' + e);
	// 	}
	// }
}