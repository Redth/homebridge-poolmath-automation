
export class MeadowPoolStatus {

	constructor(
		public readonly address: string,
		public readonly port: number,

		public Heating: boolean,
		public Pump: number,
		public SwgPercent: number,
		public ThermostatTarget: number,

		public readonly Timestamp: number,
		public readonly Temp: number,
		public readonly Pressure: number,
		public readonly SwgCycleTimeOn: number,
		public readonly SwgCycleTime: number,
		public readonly SwgCycleDuration: number,
		public readonly PoolMathUserId: string) {
	}
}
