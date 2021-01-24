Module.register("MMM-UKLiveTrainDepartures", {
	// Set default options
	defaults: {
		updateInterval: 5 * 60 * 1000, // 5 minutes
		templateName: "default",
		logData: false,
		maxTrains: 5,
		getLiveArrivals: false,

		// API info
		// https://developer.transportapi.com/docs?raml=https://transportapi.com/v3/raml/transportapi.raml
		apiBaseUrl: "https://transportapi.com/v3/uk/train/station/",
		app_id: null,
		app_key: null,

		// Location codes (can be CRS or TIPLOC; assumed CRS unless specified)
		// https://developer.transportapi.com/docs?raml=https://transportapi.com/v3/raml/transportapi.raml##train_station_references
		from: null, // station_code
		to: null, // calling_at

		// Time frame
		// Times to be given in ISO8601 format (PT[HH:MM:SS])
		// https://developer.transportapi.com/docs?raml=https://transportapi.com/v3/raml/transportapi.raml##time_windows
		timeFrame: null, // to_offset

		// Operator ATOC code
		// https://wiki.openraildata.com/index.php/TOC_Codes
		operator: null // operator
	},

	// Storage for trains collection
	trains: null,
	maxTrains: null,

	// Last updated time
	lastUpdated: null,

	// Config errors
	configErrors: null,

	// Load stylesheets
	getStyles: function () {
		return ["font-awesome.css", this.file("templates/" + this.config.templateName + ".css")];
	},

	// Load extra scripts
	getScripts: function () {
		return ["Trains.js", "moment.js"];
	},

	start: function () {
		if (this.checkForConfigErrors()) {
			this.configErrors = this.checkForConfigErrors();
			Log.error("Error(s) in module configuration", this.configErrors);

			// Abort loading module
			return;
		};

		// Add template filters
		this.addFilters();

		if (this.config.logData) Log.info("Logging enabled - received train data will be logged to the console.");

		// Trigger trains update
		this.getTrains();
	},

	// Checks required config options; returns false if all ok, otherwise returns array of error messages.
	checkForConfigErrors() {
		let configErrors = [];

		// Check API info is present
		if (!this.config.app_id || !this.config.app_key) {
			configErrors.push("API information ('app_id' and/or 'app_key') missing.");
		}

		// Check station codes are present and match 3-character format (case-insensitive)
		if (!(this.config.from).match(/\b[A-Za-z]{3}\b/)) {
			configErrors.push("Invalid 'FROM' station code (must be 3 characters).");
		};

		if (!(this.config.to).match(/\b[A-Za-z]{3}\b/)) {
			configErrors.push("Invalid 'TO' station code (must be 3 characters).");
		};

		// Let getData() handle any remaining errors. User should check browser console for any issues.

		if (configErrors.length > 0) return configErrors;
		else return false;
	},

	// Let's get some trains (or busses, am I right?) in here
	getTrains() {
		this.getData()
			.then((schedule) => {
				if (schedule) {
					let trains = [];

					for (d in schedule.departures) {
						let arrival = schedule.arrivals ? schedule.arrivals.find((arr) => arr.train_uid === schedule.departures[d].train_uid) : null;
						let train = new Train(schedule.departures[d], arrival);
						trains.push(train);
					}

					// Trim the list of trains to (at most) the maximum set in config
					this.trains = trains.slice(0, Math.min(trains.length, this.config.maxTrains));

					// Set time of last successful update
					this.lastUpdated = moment();

					// Show in log if enabled
					if (this.config.logData) Log.info("Trains updated:", this.trains);
				}
			})
			.catch((error) => {
				Log.error("Error updating trains: ", error);
			})
			.finally(() => {
				// Refresh module display
				this.updateDom();

				// Schedule next update
				setTimeout(() => {
					this.getTrains();
				}, this.config.updateInterval);
			});
	},

	// Build API URL
	getUrl(journeyType) {
		let queryString = "";

		if (journeyType === "departure") {
			queryString += this.config.from + "/live.json?";
			queryString += "&calling_at=" + this.config.to + "&station_detail=calling_at";
		}

		if (journeyType === "arrival") {
			queryString += this.config.to + "/live.json?";
			queryString += "&called_at=" + this.config.from;
			queryString += "&type=arrival";
		}

		queryString += "&app_id=" + this.config.app_id;
		queryString += "&app_key=" + this.config.app_key;

		if (this.config.timeFrame) queryString += "&to_offset=" + this.config.timeFrame;
		if (this.config.operator) queryString += "&operator=" + this.config.operator;

		queryString += "&darwin=true";

		return this.config.apiBaseUrl + queryString;
	},

	// Fetch data using supplied URL and request headers
	async getData() {
		let data = { dep: null, arr: null };

		const departures = await fetch(this.getUrl("departure"), { headers: { accept: "application/json" } }).then((response) => {
			if (response.ok) return response.json();
			else {
				Log.error("Error retrieving departures. Please check your module configuration.", response.status, response.statusText);
				return false;
			}
		});

		data.dep = departures.departures.all;

		// Also fetch arrivals data if enabled
		if (this.config.getLiveArrivals) {
			const arrivals = await fetch(this.getUrl("arrival"), { headers: { accept: "application/json" } }).then((response) => {
				if (response.ok) return response.json();
				else {
					Log.error("Error retrieving arrivals. Please check your module configuration.", response.status, response.statusText);

					return false;
				}
			});

			data.arr = arrivals.arrivals.all;
		}

		return {
			departures: data.dep ? data.dep : null,
			arrivals: data.arr ? data.arr : null
		};
	},

	getTemplate: function () {
		return `templates/${this.config.templateName}.njk`;
	},

	getTemplateData: function () {
		return {
			config: this.config,
			trains: this.trains,
			maxTrains: this.maxTrains,
			lastUpdated: this.lastUpdated,
			configErrors: this.configErrors
		};
	},

	addFilters() {
		// Return the time in local format.
		this.nunjucksEnvironment().addFilter(
			"toLocal",
			function (date) {
				if (date.isValid()) {
					return moment(date).local().format("LT");
				}
				else {
					return null;
				}
			}.bind(this)
		);
	}
});
