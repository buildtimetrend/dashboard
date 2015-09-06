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
        "keenTimeframe": "today",
        "keenInterval": "hourly",
        "keenMaxAge": 300 // 5 min
    },
    "week": {
        "caption": "Week",
        "keenTimeframe": TIMEFRAME_LAST_WEEK,
        "keenInterval": "daily",
        "keenMaxAge": 600 // 10 min
    },
    "month": {
        "caption": "Month",
        "keenTimeframe": TIMEFRAME_LAST_MONTH,
        "keenInterval": "daily",
        "keenMaxAge": 600 // 10 min
    },
    "year": {
        "caption": "Year",
        "keenTimeframe": TIMEFRAME_LAST_YEAR,
        "keenInterval": "weekly",
        "keenMaxAge": 1800 // 30 min
   }
};

var timeframeButtons = new ButtonClass(
    BUTTONS_TIMEFRAME,
    BUTTON_TIMEFRAME_DEFAULT,
    BUTTON_TIMEFRAME_PREFIX
);
timeframeButtons.onClick = function() { updateCharts(); };

var filterOptions = [];
/* example, implemented in trends.js
var filterOptions = [
    {
        "selectId": "filter_", // id of html selection box
        "queryField": "", // keen field to query on
        "keenEventCollection": "build_jobs", // keen collection
        "caption": "Build matrix" // title used in selection box
    }
];*/

var filterValues = {};
function updateFilter(parameter, value) {
    filterValues[parameter] = value;

    var filterList = [];

    $.each(filterValues, function(index, value) {
        if (!isEmpty(value)) {
            filterList.push({"property_name": index,"operator":"eq","property_value": value});
        }
    });

    // update Filters for all related charts
    $.each(charts, function () {
        this.updateFilters(filterList);
    });
}

function createFilterOptions() {
    $("#filter_options").html("Filter on : ");
    $.each(filterOptions, function () {
        // create new select tag
        $("#filter_options").append(
            "<select id='" + this.selectId + "'></select>"
        );

        // initialise select filter
        initFilterOptions(this);
    });
}

function initFilterOptions(filterParams) {
    $('#' + filterParams.selectId).change(function() {
        updateFilter(filterParams.queryField, this.value);
    });

    populateFilterOptions(filterParams);
}

function populateFilterOptions(filterParams) {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // empty options and add placeholder
    $('#' + filterParams.selectId)
        .empty()
        .append($('<option>', {
            value : '',
            text : filterParams.caption
        }));

    var querySelectUnique = new Keen.Query("select_unique", {
        eventCollection: filterParams.keenEventCollection,
        targetProperty: filterParams.queryField,
        timeframe: updatePeriod.keenTimeframe
    });

    // Send query
    client.run(querySelectUnique, function(err, response) {
        if (!err) {
            $.each(response.result, function (i, item) {
                if (item !== null) {
                    $('#' + filterParams.selectId).append($('<option>', {
                        text : item
                    }));
                }
            });
        }
    });
}

// arrays with queries and query request to update
var queriesInterval = [];
var queriesTimeframe = [];
var charts = [];
var queryRequests = [];

function getUpdatePeriod() {
    return timeframeButtons.getCurrentButton();
}

/**
 * Refresh charts with interval and timeframe selected by timeframeButtons.
 */
function updateCharts() {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // update all interval based queries
    $.each(queriesInterval, function () {
        this.set({interval: updatePeriod.keenInterval});
    });

    // update all timeframe based queries
    $.each(queriesTimeframe, function () {
        this.set({
            timeframe: updatePeriod.keenTimeframe,
            maxAge: updatePeriod.keenMaxAge});
    });

    // refresh all updated query requests
    $.each(queryRequests, function () {
        this.refresh();
    });
    $.each(charts, function () {
        this.request.refresh();
    });

    // repopulate filter options
    $.each(filterOptions, function () {
        populateFilterOptions(this);
    });
}

/**
 * Enable auto refresh (if defined by url parameter).
 *
 * If url parameter `refresh` is defined, auto refreshing the charts is enabled.
 * Refresh is defined in minutes.
 * Refresh rate should at least be equal to maximum age of the Query cache,
 * if not the cache max age value will be used (typically, 10 min).
 */
function setAutoRefresh() {
    var refreshParam = getUrlParameter('refresh');
    if (isEmpty(refreshParam) || isNaN(refreshParam)) {
        return;
    }

    var refreshSecs = 60 * parseInt(refreshParam, 10);

    // disable auto refresh if value is zero or less
    if (refreshSecs <= 0) {
        return;
    }

    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // refresh rate should not be smaller than the cache max age
    if (refreshSecs < updatePeriod.keenMaxAge) {
        refreshSecs = updatePeriod.keenMaxAge;
    }

    setInterval(function(){updateCharts();}, 1000 * refreshSecs);
}
