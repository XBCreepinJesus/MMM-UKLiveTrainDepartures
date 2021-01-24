class Train {
	constructor(dep, arr) {
		this.trainID = dep.train_uid;

		this.status = dep.status.toLowerCase();
		this.bus = dep.mode == "bus" ? true : false;

		this.origin = dep.origin_name;
		this.destination = dep.destination_name;

		this.operator = {
			code: dep.operator,
			name: dep.operator_name
		};

		this.departure = {
			liveTime: new moment(dep.expected_departure_time, "HH:mm").local(),
			schedTime: new moment(dep.aimed_departure_time, "HH:mm").local(),
			delay: new moment(dep.expected_departure_time, "HH:mm").local().diff(new moment(dep.aimed_departure_time, "HH:mm").local(), "minutes"),
			platform: dep.platform
		};

		this.arrival = {
			liveTime: arr ? new moment(arr.expected_arrival_time ? arr.expected_arrival_time : null, "HH:mm").local() : null,
			delay: arr ? new moment(arr.expected_arrival_time, "HH:mm").local().diff(new moment(arr.aimed_arrival_time, "HH:mm").local(), "minutes") : null,
			schedTime: arr ? new moment(arr.aimed_arrival_time, "HH:mm").local() : new moment(dep.station_detail.calling_at[0].aimed_arrival_time, "HH:mm").local(),
			platform: arr ? arr.platform : dep.station_detail.calling_at[0].platform
		};

		this._fullInfo = { departure: dep, arrival: arr ? arr : null };
	}
}