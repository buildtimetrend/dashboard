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

// use Keen JS API default colors :
// https://github.com/keen/keen-js/blob/master/src/dataviz/dataviz.js#L48
var GREEN = '#73d483';
var RED = '#fe6672';
var YELLOW = '#eeb058';
var BLUE = '#5a9eed';
var LAVENDER = '#c879bb';

// Timeframe button constants
var BUTTON_TIMEFRAME_NAME = "timeframe";
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
    BUTTON_TIMEFRAME_NAME,
    BUTTONS_TIMEFRAME,
    BUTTON_TIMEFRAME_DEFAULT
);
timeframeButtons.onClick = function() { updateCharts(); };

// arrays with queries and query request to update
var chartsInterval = [];
var chartsTimeframe = [];
var chartsUpdate = [];

// filter options definition
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
function getFilterList() {
    var filterList = [];

    $.each(filterValues, function(index, value) {
        if (!isEmpty(value)) {
            filterList.push({"property_name": index,"operator":"eq","property_value": value});
        }
    });

    return filterList;
}

function updateChartFilters() {
    // update Filters for all related charts
    $.each(chartsUpdate, function () {
        this.updateFilters(getFilterList());
    });
}

function updateFilter(parameter, value) {
    filterValues[parameter] = value;

    updateChartFilters();
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
    $('#' + filterParams.selectId)
        .change(function() {
            updateFilter(filterParams.queryField, this.value);
        })
        .append($('<option>', {
            value : '',
            text : filterParams.caption
        }));

    var urlParamValue = getUrlParameter(filterParams.selectId);

    if (! isEmpty(urlParamValue)) {
        $('#' + filterParams.selectId)
            .append($('<option>', {
                text : urlParamValue
            }))
            .val(urlParamValue);
            filterValues[filterParams.queryField] = urlParamValue;
    }

    populateFilterOptions(filterParams, urlParamValue);
}

function populateFilterOptions(filterParams, extraValue) {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // use current value if newValue is not defined
    var currentValue = $('#' + filterParams.selectId).val();
    var valFound = false;

    var querySelectUnique = new Keen.Query("select_unique", {
        eventCollection: filterParams.keenEventCollection,
        targetProperty: filterParams.queryField,
        timeframe: updatePeriod.keenTimeframe
    });

    // Send query
    client.run(querySelectUnique, function(err, response) {
        // empty options and add placeholder
        $('#' + filterParams.selectId)
            .empty()
            .append($('<option>', {
                value : '',
                text : filterParams.caption
            }));

        if (!err) {
            var items = response.result;
            if (! isEmpty(extraValue)) {
                items.push(extraValue);
            }

            // loop over the possible options
            $.each(items, function (i, item) {
                if (!valFound && !isEmpty(currentValue) && currentValue === item) {
                    valFound = true;
                }

                if (item !== null) {
                    $('#' + filterParams.selectId).append($('<option>', {
                        text : item
                    }));
                }
            });

            // set to currently selected value
            if (valFound) {
                $('#' + filterParams.selectId).val(currentValue);
            } else if (!isEmpty(currentValue)) {
                // trigger change event to reset nonexistent value
                $('#' + filterParams.selectId).trigger("change");
            }
        }
    });
}

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
    $.each(chartsInterval, function () {
        $.each(this.queries, function () {
            this.set({interval: updatePeriod.keenInterval});
        });
    });

    // update all timeframe based queries
    $.each(chartsTimeframe, function () {
        $.each(this.queries, function () {
            this.set({
                timeframe: updatePeriod.keenTimeframe,
                maxAge: updatePeriod.keenMaxAge});
        });
    });

    // refresh all updated query requests
    $.each(chartsUpdate, function () {
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
