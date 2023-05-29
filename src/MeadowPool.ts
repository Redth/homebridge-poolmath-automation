import axios from 'axios';

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

export class MeadowPool {
	constructor(
		public readonly address: string,
		public readonly port: number) {

		this.baseUrl = 'http://' + this.address + ':' + this.port;

		this.status = new MeadowPoolStatus(address, port, 0, 0, 0, 0, 0, 0, 0, 100, '');
	}

	readonly baseUrl: string;

	public status: MeadowPoolStatus;

	async updateStatus() {
		const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/status');

		this.status = resp.data;
	}

	async setPumpProgram(pumpProgram: number) {
		const previousPumpProgram = this.status.Pump;

		this.status.Pump = pumpProgram;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/pump/' + pumpProgram);
			this.status = resp.data;
		} catch (ex) {
			this.status.Pump = previousPumpProgram;
			throw ex;
		}
	}

	async setHeaterState(heaterState: number) {
		const previousHeaterState = this.status.Heater;

		this.status.Heater = heaterState;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/heater/' + heaterState);
			this.status = resp.data;
		} catch (ex) {
			this.status.Heater = previousHeaterState;
			throw ex;
		}
	}

	async setSwgPercent(swgPercent: number) {
		const previousSwgPercent = this.status.SwgPercent;

		this.status.SwgPercent = swgPercent;
		try {
			const resp = await axios.get<MeadowPoolStatus>(this.baseUrl + '/swg/' + swgPercent);
			this.status = resp.data;
		} catch (ex) {
			this.status.SwgPercent = previousSwgPercent;
			throw ex;
		}
	}
}