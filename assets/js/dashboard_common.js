/* vim: set expandtab sw=4 ts=4: */
/**
 * Common functions and variables to enable a dashboard.
 *
 * Copyright (C) 2014-2015 Dieter Adriaenssens <ruleant@users.sourceforge.net>
 *
 * This file is part of buildtimetrend/dashboard
 * <https://github.com/buildtimetrend/dashboard/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var TIMEFRAME_LAST_WEEK = "this_7_days";
var TIMEFRAME_LAST_MONTH = "this_30_days";
var TIMEFRAME_LAST_YEAR = "this_52_weeks";

var CAPTION_LAST_WEEK = "Last week";
var CAPTION_LAST_MONTH = "Last month";
var CAPTION_LAST_YEAR = "Last year";

var TIMEZONE_SECS = "UTC"; // named timezone or offset in seconds, fe. GMT+1 = 3600

// Timeframe button constants
var BUTTON_TIMEFRAME_PREFIX = "timeframe_";
var BUTTON_TIMEFRAME_DEFAULT = "week";
var BUTTONS_TIMEFRAME = {
    "day": {
        "caption": "Day",
        "onClick": function() { updateCharts("day"); }
    },
    "week": {
        "caption": "Week",
        "onClick": function() { updateCharts("week"); }
    },
    "month": {
        "caption": "Month",
        "onClick": function() { updateCharts("month"); }
    },
    "year": {
        "caption": "Year",
        "onClick": function() { updateCharts("year"); }
    }
};

var TimeFrameButtons = new ButtonClass(
    BUTTONS_TIMEFRAME,
    BUTTON_TIMEFRAME_DEFAULT,
    BUTTON_TIMEFRAME_PREFIX
);

// arrays with queries and query request to update
var queriesInterval = [];
var queriesTimeframe = [];
var queryRequests = [];

function getUpdatePeriod(period) {
    var keenTimeframe, keenInterval, keenMaxAge;

    switch (period) {
    case "day":
        keenTimeframe = "today";
        keenInterval = "hourly";
        keenMaxAge = 3600; // 1 hour
        break;
    default:
        period = "week";
    case "week":
        keenTimeframe = TIMEFRAME_LAST_WEEK;
        keenInterval = "daily";
        keenMaxAge = 24 * 3600; // 1 day
        break;
    case "month":
        keenTimeframe = TIMEFRAME_LAST_MONTH;
        keenInterval = "daily";
        keenMaxAge = 24 * 3600; // 1 day
        break;
    case "year":
        keenTimeframe = TIMEFRAME_LAST_YEAR;
        keenInterval = "weekly";
        keenMaxAge = 7 * 24 * 3600; // 1 week
        break;
    }

    return {
        name: period,
        keenTimeframe: keenTimeframe,
        keenInterval: keenInterval,
        keenMaxAge: keenMaxAge
    };
}

function updateCharts(periodName) {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod(periodName);

    var i;

    // update all interval based queries
    for (i = 0; i < queriesInterval.length; i++) {
        queriesInterval[i].set({interval: updatePeriod.keenInterval});
    }

    // update all timeframe based queries
    for (i = 0; i < queriesTimeframe.length; i++) {
        queriesTimeframe[i].set({
            timeframe: updatePeriod.keenTimeframe,
            maxAge: updatePeriod.keenMaxAge});
    }

    // refresh all updated query requests
    for (i = 0; i < queryRequests.length; i++) {
        queryRequests[i].refresh();
    }
}
