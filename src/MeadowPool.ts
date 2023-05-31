import axios from 'axios';
import { debounce } from 'ts-debounce';
import { EventEmitter } from 'events';

export class MeadowPoolStatus {

	constructor(
		public readonly address: string,
		public readonly port: number,

		public Heater: number,
		public Pump: number,
		public SwgPercent: number,

		public readonly Temp: number,
		public readonly Pressure: number,
		public readonly SwgCycleTimeOn: number,
		public readonly SwgCycleTime: number,
		public readonly SwgCycleDuration: number,
		public readonly PoolMathUserId: string) {
	}
}

export class MeadowPool extends EventEmitter {
	constructor(
		public readonly address: string,
		public readonly port: number,
		public readonly updateIntervalMs: number) {

		super();

		this.baseUrl = 'http://' + this.address + ':' + this.port;

		this.status = new MeadowPoolStatus(address, port, 0, 0, 0, 0, 0, 0, 0, 100, '');

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
		const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/status');

		this.setStatus(resp.data);
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
		} catch (ex) {
			this.status.Pump = previousPumpProgram;
			this.setStatus(this.status);
			throw ex;
		}
	}

	readonly debouncedSetHeaterStateInternal = debounce(this.setHeaterStateInternal, 1200);
	public async setHeaterState(heaterState: number) {
		return await this.debouncedSetHeaterStateInternal(heaterState);
	}

	async setHeaterStateInternal(heaterState: number) {
		const previousHeaterState = this.status.Heater;

		this.status.Heater = heaterState;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/heater/' + heaterState);
			this.setStatus(resp.data);
		} catch (ex) {
			this.status.Heater = previousHeaterState;
			this.setStatus(this.status);
			throw ex;
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
		} catch (ex) {
			this.status.SwgPercent = previousSwgPercent;
			this.setStatus(this.status);
			throw ex;
		}
	}
}