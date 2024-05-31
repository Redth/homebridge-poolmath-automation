import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { MeadowPoolStatus } from './MeadowPoolStatus';
import { Logger } from 'homebridge';

export class InfluxDbLogger {

	constructor(
		public readonly url: string,
		public readonly token: string,
        public readonly org: string,
        public readonly bucket: string) {
	}

	public log(log: Logger, tag: string, controllerId: string, poolStatus: MeadowPoolStatus) {
		const writeApi = new InfluxDB({ url: this.url, token: this.token }).getWriteApi(this.org, this.bucket);
		const point = new Point('status')
			.tag('controller_id', controllerId)
			.intField('heating', poolStatus.Heating ? 1 : 0)
			.floatField('pressure', poolStatus.Pressure)
			.intField('pump_mode', poolStatus.Pump)
			.intField('swg_cycle_duration', poolStatus.SwgCycleDuration)
			.intField('swg_cycle_time', poolStatus.SwgCycleTime)
			.intField('swg_cycle_time_on', poolStatus.SwgCycleTimeOn)
			.intField('swg_percent', poolStatus.SwgPercent)
			.floatField('temperature', poolStatus.Temp)
			.floatField('thermostat_target', poolStatus.ThermostatTarget);
		writeApi.writePoint(point);
		writeApi.close()
			.then(() => {
				log.info(`${tag} Data written to InfluxDB`);
			})
			.catch(e => {
				log.error(`${tag} Error writing to InfluxDB: ${e}`);
			});
	}
}
