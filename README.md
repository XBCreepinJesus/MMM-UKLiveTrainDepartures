# MMM-UKLiveTrainDepartures

A module for MagicMirror² showing the next *direct* trains calling at the destination from a given origin. Note this is not a journey planner - it can only show trains that both start and stop/terminate at given stations.

>![](/screenshots/demo.png)<br>Next 4 trains to Reading from London Paddington.

This module was based on this existing National Rail module (https://github.com/nwootton/MMM-UKNationalRail). I originally made this new one as a project and to tailor it to our own needs for our MagicMirror, but have now made it to be more usable by others. However, this module has much fewer options: basically just a to/from station, as all we needed to know was the status of the next few trains to work. If you need lots of other options or train filters/parameters, you may be better with the other module, but you can also make a new template for this one ([see below](#templates)).

---
## Installation

Install using Git into the modules directory of your MagicMirror installation:

```bash
git clone https://github.com/XBCreepinJesus/MMM-UKLiveTrainDepartures.git
```

Then add it to your `config.js` modules section like any other module:

```javascript
modules: [
    {
        module: "MMM-UKLiveTrainDepartures",
        header: "Next trains to Edinburgh from Kings Cross",    // for example
        position: "bottom_right",   // can be anywhere you like
        config: {
            app_id: "[YOUR APP ID]",
            app_key: "[YOUR APP KEY]",
            from: "KGX",
            to: "EDB",
        },
    },
],
```
---
## Configuration

The required options are:
|Option|Description|
|---|---|
|`app_id`<br>`app_key`|Add your Application ID (`app_id`) and an Application Key (`app_key`) for the Transport API. If you haven't already set up an account and/or application, [see below](#transport-api-setup) for details.
|`from`<br>`to`|The 3-character CRS station codes for the departure/destination stations. (e.g., *KGX* for London King's Cross)<br>These can be found at [the Railway Codes website](http://www.railwaycodes.org.uk/crs/crs0.shtm) or on [National Rail's journey planner](https://ojp.nationalrail.co.uk/service/planjourney/search) (look for the code in square brackets after the station name).

The following configurations are all optional:
|Option|Default|Description|
|---|---|---|
|`operator`|(not used)|Filter results by a specific train operator (TOC) using their ATOC code ([see list](https://wiki.openraildata.com/index.php/TOC_Codes)).<br>Example: `"SW"`
|`getLiveArrivals`|`false`|Set to `true` to also fetch estimated arrival times at the destination. If this is left `false` then arrival times are only the scheduled times.<br>Note that this makes a separate call to the API, so be sure to set the `updateInterval` (see below) to a suitable length to as to not go over your API call limit!
|`timeFrame`|`PT02:00:00`<br>(2 hours)|From Transport API: *Modifies the end of the time window for which services are retrieved. By default, this is two hours in the future relative to the date/time of interest.*<br>In short, give a time window in the format `"PTHH:mm:ss"`. Useful if there is only one train an hour from your station and you want to show more than just the next two trains.<br>[See the Transport API docs for more information on this.](https://developer.transportapi.com/docs?raml=https://transportapi.com/v3/raml/transportapi.raml##time_windows)
|`updateInterval`|`5*60*1000`<br>(5 minutes)|Time (in milliseconds) between updates.
|`templateName`|`default`|If you want to use a different Nunjucks template and style, give the name of the template here (excluding `.njk` extension).
|`logData`|`false`|Set to `true` to see various outputs in the browser's console log; useful if you are trying to identify an issue or see all the data.
|`maxTrains`|`5`|Used to limit the number of results to show.

---
## Templates

This module uses Nunjucks templates to render its output. These are easier to use than writing HTML through Javascript, and has the benefit of allowing the end user to simply create a new template to use without having to recode the module.

The default template shows a table of departures with their times and status. "Live" times are shown in italics, and delays/cancellations are coloured appropriately. If a service is replaced by a bus, there will be a bus icon shown for that train instead of a platform.

>![](/screenshots/demo_bus.png)<br>Busses currently replace trains on the Isle of Wight's Island Line.

If you'd like to use a different template, create a `.njk` (and optional `.css`) file in the module directory and set the `templateName` option in the config to the name of your template (minus the .njk extension). For example, if you've created a template called `fabNewTemplate.njk`, adjust your module config to include `templateName: "fabNewTemplate"`.

The module will pass all the following information to the template:
|Name|Description|
|---|---|
|`config`|Gives the template access to anything in the module config; e.g., `{{ config.from }}`|
|`trains`|The list of [`Train`](#the-train-class) entities. You can iterate through these to create a table or list of departures in the template.<br>For example: `{% for t in trains %} ... {% endfor %}`<br>See below for information on what each `Train` contains.|
|`lastUpdated`|A `moment` of the last successful update.|
|`configErrors`|A collection of module configuration errors; e.g., if the station code is in the wrong format.|

### Filters

The `toLocal` filter takes a `moment` and returns it in the `LT` format for your locale; e.g., "14:56" or "2:56 pm". This is also a useful way to verify a time before showing it in a template - if it's an invalid time (for whatever reason), then the filter returns nothing instead of "Invalid Date".

---
## The `Train` Class

After fetching the data from the API, the module creates a collection of `Train` objects. The structure of the `Train` is as follows:
```
Train
+-- trainID: unique train ID number (used to match between departure and arrival data)
+-- status: status text of the train (e.g., on time, late, cancelled, etc.)
+-- bus: whether the train is a replacement bus service (true/false)
+-- origin: name of train's origin station (e.g., London King's Cross)
+-- destination: name of train's final destination station (e.g., Edinburgh)
+-- operator
|   +-- code: operator's ATOC code (e.g., SW)
|   +-- name: train operator's name (e.g., South Western Railway)
+-- departure
|   +-- liveTime: the estimated departure time (including delay)
|   +-- schedTime: the scheduled departime time
|   +-- delay: number of minutes delayed (calculated by subtracting scheduled time from estimated time)
|   +-- platform: departure platform number
+-- arrival
|   +-- liveTime*: the estimated arrival time
|   +-- schedTime: the scheduled arrival time
|   +-- delay*: number of minuted delayed
|   +-- platform: arrival platform number
+-- _fullInfo
|   +-- departure: all departure fields (see below)
|   +-- arrival: all arrival fields (if fetched)

* - these fields are null if getLiveArrivals is disabled.
```

You can use any or all of these fields in a custom template. They are most easily accessed when iterating through the list of trains:
```javascript
{% for t in trains %}
    {{ t.departure.liveTime }} {{ t.destination }}      // 12:34 Penzance
{% endfor %}
```

If you need to access any other fields returned from the API, you can use `._fullInfo.depature.___` and `._fullInfo.arrival.___` where `___` is the field as specified in the API documentation under [/uk/train/station/{station_code}/live.json](https://developer.transportapi.com/docs?raml=https://transportapi.com/v3/raml/transportapi.raml##uk_train_station_station_code_live_json). For example, `._fullInfo.departure.category` returns the category of the train (e.g., `"OO"` for a standard passenger service).

---
## Transport API setup

If you do not already have a Transport API account, sign up here at https://developer.transportapi.com/ and follow the instructions on there to get your application ID and key.

At time of writing, the free plan gives you 1000 'hits' per day. With default settings, this module uses 1 hit per update; if you enable `getLiveArrivals`, it will use 2 hits per update - a 5 minute update interval will therefore use 288 or 576 hits per day, depending on your live arrivals setting.