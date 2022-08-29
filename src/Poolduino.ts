import axios from 'axios';

export class PoolduinoStatus {

	constructor(
		public readonly address: string,
		public readonly port: number,

		public heaterState: number,
		public readonly heaterTemp: number,
		public readonly systemMode: number,
		public pumpProgram: number,
		public swgPercent: number,
		public readonly swgCycleTimeOn: number,
		public readonly swgCycleTime: number,
		public readonly currentTemp: number,
		public readonly poolMathUserId: string,
		public readonly currentMinOfDay: number) {
	}
}

export class Poolduino {
	constructor(
		public readonly address: string,
		public readonly port: number) {

		this.baseUrl = 'http://' + this.address + ':' + this.port;

		this.status = new PoolduinoStatus(address, port, 0, 0, 0, 0, 0, 0, 0, 0, '', 0);
	}

	readonly baseUrl: string;

	public status: PoolduinoStatus;

	async updateStatus() {
		const resp = await axios.get<PoolduinoStatus>(this.baseUrl + '/info');

		this.status = resp.data;
	}

	async setPumpProgram(pumpProgram: number) {
		const previousPumpProgram = this.status.pumpProgram;

		this.status.pumpProgram = pumpProgram;
		try {
			const resp = await axios.get<PoolduinoStatus>(this.baseUrl + '/pump?program=' + pumpProgram);
			this.status = resp.data;
		} catch (ex) {
			this.status.pumpProgram = previousPumpProgram;
			throw ex;
		}
	}

	async setHeaterState(heaterState: number) {
		const previousHeaterState = this.status.heaterState;

		this.status.heaterState = heaterState;
		try {
			const resp = await axios.get<PoolduinoStatus>(this.baseUrl + '/heater?state=' + heaterState);
			this.status = resp.data;
		} catch (ex) {
			this.status.heaterState = previousHeaterState;
			throw ex;
		}
	}

	async setSwgPercent(swgPercent: number) {
		const previousSwgPercent = this.status.swgPercent;

		this.status.swgPercent = swgPercent;
		try {
			const resp = await axios.get<PoolduinoStatus>(this.baseUrl + '/swg?percent=' + swgPercent);
			this.status = resp.data;
		} catch (ex) {
			this.status.swgPercent = previousSwgPercent;
			throw ex;
		}
	}
}