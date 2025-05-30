Module.register("MMM-SpaceLaunchNow", {

    // Default module config.
    defaults: {
        updateInterval: 60 * 60 * 1000,
        animationSpeed: 1000,
        lang: config.language,
        records: 5,
        modus: "past",
        showExtraInfo: false,
        showLaunchSite: false,
        showColumnHeader: false,
        initialLoadDelay: 2500,
        retryDelay: 2500,
        headerText: "",
        maxWidthWide: 30,
        maxWidthSmall: 12,
        apiBase: "https://ll.thespacedevs.com/2.2.0/launch",
        tableClass: "small",
        spacexlogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/SpaceX-Logo-Xonly.svg/1280px-SpaceX-Logo-Xonly.svg.png",
        nasalogo: "https://tinyurl.com/s2ddgbr",
        anderslogo: "https://i.pinimg.com/originals/7d/44/1f/7d441fa1467d5e2e92d6b2622455c586.png",
    },

    // Define required scripts.
    getScripts: function () {
        return ["moment.js"];
    },

    // Define required stylescripts.
    getStyles: function () {
        return ["MMM-SpaceLaunchNow.css"];
    },

    // Define start sequence.
    start: function () {
        Log.info("Starting module: " + this.name);

        // Set locale.
        moment.locale(config.language);

        this.launch = [];
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);

        this.updateTimer = null;

    },

    // Override dom generator.
    getDom: function () {
        var wrapper = document.createElement("div");

        var shortDesc = true;
        switch (this.data.position) {
            case "top_bar":
            case "bottom_bar":
            case "middle_center":
            case "upper_third":
            case "lower_third":
                shortDesc = false;
                break;
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = this.config.tableClass;

        if (this.config.showColumnHeader) {
            table.appendChild(this.getTableHeaderRow());
        }

        var recordCount = 0;

        for (var s in this.launch.results) {
            if (recordCount > this.config.records) { break; }

            var launch = this.launch.results[s];

            var launchRow = document.createElement("tr");
            table.appendChild(launchRow);

            var rocket = document.createElement("td");
            rocket.innerHTML = launch.rocket.configuration.name;
            launchRow.appendChild(rocket);

            if (this.config.showExtraInfo) {
                var agency = document.createElement("td");
                if (launch.launch_service_provider.name.length > 12 && shortDesc == true) {
                    agency.innerHTML = launch.launch_service_provider.name.slice(0, 12) + "...";
                } else if (launch.launch_service_provider.name.length > this.config.maxWidthWide) {
                    agency.innerHTML = launch.launch_service_provider.name.slice(0, this.config.maxWidthWide) + "...";
                } else {
                    agency.innerHTML = launch.launch_service_provider.name;
                }
                launchRow.appendChild(agency);
            }

            var mission = document.createElement("td");
            if (!launch.mission) {
                mission.innerHTML = "Unknown";
            } else {
                if (launch.mission.name.length > 12 && shortDesc == true) {
                    mission.innerHTML = launch.mission.name.slice(0, 12) + "...";
                } else if (launch.mission.name.length > this.config.maxWidthWide) {
                    mission.innerHTML = launch.mission.name.slice(0, this.config.maxWidthWide) + "...";;
                } else {
                    mission.innerHTML = launch.mission.name;
                }
            }
            launchRow.appendChild(mission);


            if (this.config.showLaunchSite) {
                var launchSite = document.createElement("td");
                if (launch.pad.name.length > 12 && shortDesc == true) {
                    launchSite.innerHTML = launch.pad.name.slice(0, 12) + "...";
                } else if (launch.pad.name.length > this.config.maxWidthWide) {
                    launchSite.innerHTML = launch.pad.name.slice(0, this.config.maxWidthWide) + "...";;
                } else {
                    launchSite.innerHTML = launch.pad.name;
                }
                launchRow.appendChild(launchSite);
            }

            var launchDate = document.createElement("td");
            var timestamp = new Date(launch.net);
            if (this.config.showExtraInfo) {
                var localLaunchDate = timestamp.toString().slice(4, 11) + "- " + timestamp.toString().slice(16, 21);
            } else {
                var localLaunchDate = timestamp.toString().slice(4, 11);
            }
            launchDate.innerHTML = localLaunchDate;
            launchRow.appendChild(launchDate);

            var status = document.createElement("td");
            status.innerHTML = launch.status.name;
            launchRow.appendChild(status);

            recordCount++;
        }

        return table;
    },

    // Override getHeader method.
    getHeader: function () {
        this.data.header = (this.config.headerText ? (this.config.headerText + " - ") : "") + this.config.modus.toUpperCase() + " LAUNCHES";
        return this.data.header;
    },

    // Requests new data from launch Api.
    updateLaunchData: function () {
        var today = new Date().toISOString().slice(0, 10)
        var options = "&limit=" + this.config.records;
        if (this.config.modus === "upcoming") {
            options = "&&window_start__gte=" + today;
        } else if (this.config.modus === "past") {
            options = "&&window_start__lte=" + today;
        }

        var url = this.config.apiBase + "?format=json" + options;
        var self = this;
        var retry = true;

        var apiRequest = new XMLHttpRequest();
        apiRequest.open("GET", url, true);
        apiRequest.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processLaunch(JSON.parse(this.response));
                }
                else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    retry = true;
                }
                else {
                    Log.error(self.name + ": Could not load launch data.");
                }

                if (retry) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        apiRequest.send();
    },

    // processLaunch
    processLaunch: function (data) {
        this.launch = data;

        this.show(this.config.animationSpeed, { lockString: this.identifier });
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    // Schedule next update.
    scheduleUpdate: function (delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(function () {
            self.updateLaunchData();
        }, nextLoad);
    },

    getTableHeaderRow: function () {
        var thRocket = document.createElement("th");
        thRocket.appendChild(document.createTextNode("Rocket"));
        if (this.config.showExtraInfo) {
            var thAgency = document.createElement("th");
            thAgency.appendChild(document.createTextNode("Agency"));
        }
        var thMission = document.createElement("th");
        thMission.appendChild(document.createTextNode("Mission"));
        if (this.config.showLaunchSite) {
            var thLaunchSite = document.createElement("th");
            thLaunchSite.appendChild(document.createTextNode("Site"));
        }
        var thLaunchDate = document.createElement("th");
        thLaunchDate.appendChild(document.createTextNode("Date"));
        var thStatus = document.createElement("th");
        thStatus.appendChild(document.createTextNode("Status"));

        var thead = document.createElement("thead");
        thead.appendChild(thRocket);
        if (this.config.showExtraInfo) {
            thead.appendChild(thAgency);
        }
        thead.appendChild(thMission);
        if (this.config.showLaunchSite) {
            thead.appendChild(thLaunchSite);
        }
        thead.appendChild(thLaunchDate);
        thead.appendChild(thStatus);

        return thead;
    },
});
