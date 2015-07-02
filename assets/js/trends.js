/* vim: set expandtab sw=4 ts=4: */
/**
 * Analyse and visualise trend data using the Keen.io API.
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

// Build result button constants
var BUTTON_RESULT_PREFIX = "result_";
var BUTTON_RESULT_DEFAULT = "failed";
var BUTTONS_RESULT = {
    "passed": {
        "caption": "Passed",
        "onClick": function() { onClickResultButton(); }
    },
    "failed": {
        "caption": "Failed",
        "onClick": function() { onClickResultButton(); }
    },
    "errored": {
        "caption": "Errored",
        "onClick": function() { onClickResultButton(); }
    }
};
// Groupby button constants
var BUTTON_GROUPBY_PREFIX = "groupby_";
var BUTTON_GROUPBY_DEFAULT = "matrix";
var BUTTONS_GROUPBY = {
    "branch": {
        "caption": "Branch",
        "onClick": function() { onClickResultButton(); },
        "queryField": "job.branch",
        "titleCaption": "branch name"
    },
    "matrix": {
        "caption": "Build matrix",
        "onClick": function() { onClickResultButton(); },
        "queryField": "job.build_matrix.summary",
        "titleCaption": "build env parameters"
    }
};

// use Keen JS API default colors :
// https://github.com/keen/keen-js/blob/master/src/dataviz/dataviz.js#L48
var GREEN = '#73d483';
var RED = '#fe6672';
var YELLOW = '#eeb058';

// arrays with queries and query request to update
var queriesInterval = [];
var queriesTimeframe = [];
var queryRequests = [];

/**
 * Merge data from several series, with identical X-axis labels
 *
 * Parameters :
 * - data : Keen.io query results
 * - indexCaptions : Captions for the index of the values
 * - valueFieldname : name of the value field in the query result array
 * - seriesCaptions : captions for the data series
 */
function mergeSeries(data, indexCaptions, valueFieldname, seriesCaptions) {
    var chartData = [];
    // create and populate data array
    var i, j;
    for (i = 0; i < indexCaptions.length; i++) {
        chartData[i]={caption: indexCaptions[i]};
        // populate all series
        for (j = 0; j < seriesCaptions.length; j++) {
            chartData[i][seriesCaptions[j]] = 0;
        }
    }
    // loop over all query result sets
    for (j = 0; j < data.length; j++) {
        var timeframeResult = data[j].result;
        var timeframeCaption = seriesCaptions[j];
        // copy query data into the populated array
        for (i = 0; i < timeframeResult.length; i++) {
            var index = parseInt(timeframeResult[i][valueFieldname], 10);
            chartData[index][timeframeCaption] = timeframeResult[i].result;
        }
    }

    return chartData;
}

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

// Build Job result class
var BuildJobResultClass = {
    resultButtons: new ButtonClass(
        BUTTONS_RESULT,
        BUTTON_RESULT_DEFAULT,
        BUTTON_RESULT_PREFIX
    ),
    groupByButtons: new ButtonClass(
        BUTTONS_GROUPBY,
        BUTTON_GROUPBY_DEFAULT,
        BUTTON_GROUPBY_PREFIX
    ),
    // Get Build job result filter
    getFilters: function () {
        var filters = [];
        filters.push({
            "property_name": "job.result",
            "operator": "eq",
            "property_value": this.resultButtons.currentButton
        });

        // only group records that have the build_matrix field
        if (this.groupByButtons.currentButton === "matrix") {
            filters.push({
                "property_name": this.getQueryGroupByField(),
                "operator":"exists",
                "property_value":true
            });
        }

        return filters;
    },
    // Get Build job result query GroupBy parameter
    getQueryGroupByField: function () {
        return this.groupByButtons.buttonList[this.groupByButtons.currentButton].queryField;
    },
    // Get Build job result title
    getTitle: function () {
        return firstCharUpperCase(this.resultButtons.currentButton) +
            " build jobs grouped by " +
            this.groupByButtons.buttonList[this.groupByButtons.currentButton].titleCaption;
    }
};

var queryJobResultBranch, chartJobResultBranch, requestJobResultBranch;
function onClickResultButton() {
    queryJobResultBranch.set({
        groupBy: BuildJobResultClass.getQueryGroupByField(),
        filters: BuildJobResultClass.getFilters()
    });
    chartJobResultBranch.title(BuildJobResultClass.getTitle());
    requestJobResultBranch.refresh();
}

// Get badge url
function getBadgeUrl() {
    // check if config.serviceUrl is set by something else than the default value
    if (isEmpty(config.serviceUrl) || config.serviceUrl === 'service_url') {
        config.serviceUrl = 'https://buildtimetrend.herokuapp.com/';
    }

    return config.serviceUrl + '/badge/';
}

// Initialize badge url
function updateBadgeUrl(periodName) {
    var badgeUrl = getBadgeUrl();

    // add repo
    if (!isEmpty(config.repoName) && config.repoName !== 'repo_name') {
        badgeUrl += config.repoName;

        var updatePeriod = getUpdatePeriod(periodName);
        var interval = updatePeriod.name;

        // add interval
        if (isEmpty(interval) || interval === 'day') {
            badgeUrl += '/latest';
        } else {
            badgeUrl += '/avg/' + interval;
        }
    }

    // change badge url
    $("#badge-url").attr('src', htmlEntities(badgeUrl));
}

function updateCharts(periodName) {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod(periodName);

    updateBadgeUrl(updatePeriod.name);

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

function initCharts() {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    TimeFrameButtons.setCurrentButton();
    TimeFrameButtons.initButtons();

    var keenMaxAge = updatePeriod.keenMaxAge;
    var keenTimeframe = updatePeriod.keenTimeframe;
    var keenInterval = updatePeriod.keenInterval;

    // display charts
    $('#charts').show();

    // visualization code goes here
    Keen.ready(function() {
        /* Total builds */
        // create query
        var queryTotalBuilds = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge
        });
        queriesTimeframe.push(queryTotalBuilds);

        // draw chart
        var chartTotalBuilds = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds"))
            .prepare();

        var requestTotalBuilds = client.run(queryTotalBuilds, function(err, res){
            if (err) {
            // Display the API error
            chartTotalBuilds.error(err.message);
            } else {
                chartTotalBuilds
                    .parseRequest(this)
                    .title("Total build jobs")
                    .width("200")
                    .render();
            }
        });
        queryRequests.push(requestTotalBuilds);

        /* Total builds passed */
        // create query
        var queryTotalBuildsPassed = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            filters: [{"property_name":"job.result","operator":"eq","property_value":"passed"}]
        });
        queriesTimeframe.push(queryTotalBuildsPassed);

        // create chart
        var chartTotalBuildsPassed = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds_passed"))
            .title("Build jobs passed")
            .width("200")
            .prepare();

        // combine queries for conditional coloring of TotalBuildspassed
        var colorBuildsPassed = client.run([queryTotalBuilds, queryTotalBuildsPassed], function(err, res){
            if (err) {
                // Display the API error
                chartTotalBuildsPassed.error(err.message);
            } else {
                var chartColor = [GREEN];
                var totalBuilds = res[0].result;
                var totalBuildsPassed = res[1].result;

                if (totalBuilds === totalBuildsPassed) {
                    chartColor = [GREEN];
                } else if (totalBuilds > 0) {
                    if ((totalBuildsPassed / totalBuilds) >= 0.75) {
                        chartColor = [YELLOW];
                    } else {
                        chartColor = [RED];
                    }
                }

                // draw chart
                chartTotalBuildsPassed
                    .parseRawData({result: totalBuildsPassed})
                    .colors(chartColor)
                    .render();
            }
        });
        queryRequests.push(colorBuildsPassed);

        /* Total builds failed */
        // create query
        var queryTotalBuildsFailed = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            filters: [{"property_name":"job.result","operator":"in","property_value":["failed","errored"]}]
        });
        queriesTimeframe.push(queryTotalBuildsFailed);

        // create chart
        var chartTotalBuildsFailed = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds_failed"))
            .title("Build jobs failed")
            .width("200")
            .prepare();

        // combine queries for conditional coloring of TotalBuildsfailed
        var colorBuildsFailed = client.run([queryTotalBuilds, queryTotalBuildsFailed], function(err, res){
            if (err) {
                // Display the API error
                chartTotalBuildsPassed.error(err.message);
            } else {
                var chartColor = [GREEN];
                var totalBuilds = res[0].result;
                var totalBuildsFailed = res[1].result;

                if (totalBuildsFailed === 0) {
                    chartColor = [GREEN];
                } else if (totalBuilds > 0) {
                    if ((totalBuildsFailed / totalBuilds) <= 0.25) {
                        chartColor = [YELLOW];
                    } else {
                        chartColor = [RED];
                    }
                }

                // draw chart
                chartTotalBuildsFailed
                    .parseRawData({result: totalBuildsFailed})
                    .colors(chartColor)
                    .render();
            }
        });
        queryRequests.push(colorBuildsFailed);

        /* average build time of all stages */
        // create query
        var queryAverageBuildTime = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.duration"
        });
        queriesTimeframe.push(queryAverageBuildTime);

        // draw chart
        var chartAverageBuildTime = new Keen.Dataviz()
            .el(document.getElementById("metric_average_build_time"))
            .width("250")
            .attributes({
                chartOptions: {
                    suffix: "s"
                }
            })
           .prepare();

        var requestAverageBuildTime = client.run(queryAverageBuildTime, function(err, res) {
            if (err) {
                // Display the API error
                chartAverageBuildTime.error(err.message);
            } else {
                chartAverageBuildTime
                    .parseRequest(this)
                    .title("Average job duration")
                    .render();
            }
        });
        queryRequests.push(requestAverageBuildTime);

        /* average stage duration */
        // create query
        var queryStageDuration = new Keen.Query("average", {
            eventCollection: "build_stages",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "stage.duration",
            groupBy: "stage.name",
            filters: [{"property_name":"stage.name","operator":"exists","property_value":true}]
        });
        queriesTimeframe.push(queryStageDuration);
        queriesInterval.push(queryStageDuration);

        // draw chart
        var chartStageDuration = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_duration"))
            .chartType("columnchart")
            .height("400")
            .attributes({
                chartOptions: {
                    isStacked: true,
                    vAxis: {title: "duration [s]"}
                }
            })
            .prepare();

        var requestStageDuration = client.run(queryStageDuration, function(err, res) {
            if (err) {
                // Display the API error
                chartStageDuration.error(err.message);
            } else {
                chartStageDuration
                    .parseRequest(this)
                    .title("Average build stage duration")
                    .render();
            }
        });
        queryRequests.push(requestStageDuration);

        /* Stage duration fraction */
        // create query
        var queryStageFraction = new Keen.Query("average", {
            eventCollection: "build_stages",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "stage.duration",
            groupBy: "stage.name",
            filters: [{"property_name":"stage.name","operator":"exists","property_value":true}]
        });
        queriesTimeframe.push(queryStageFraction);

        // draw chart
        var chartStageFraction = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_fraction"))
            .height("400")
            .prepare();

        var requestStageFraction = client.run(queryStageFraction, function(err, res) {
            if (err) {
                // Display the API error
                chartStageFraction.error(err.message);
            } else {
                chartStageFraction
                    .parseRequest(this)
                    .title("Build stage fraction of total build duration")
                    .render();
            }
        });
        queryRequests.push(requestStageFraction);

        /* Builds */
        // create query
        var queryBuilds = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "job.build",
            groupBy: "job.branch"
        });
        queriesTimeframe.push(queryBuilds);
        queriesInterval.push(queryBuilds);

        // draw chart
        var chartBuilds = new Keen.Dataviz()
            .el(document.getElementById("chart_builds"))
            .chartType("columnchart")
            .height("400")
            .attributes({
                chartOptions: {
                    isStacked: true,
                    vAxis: {title: "build count"}
                }
            })
            .prepare();

        var requestBuilds = client.run(queryBuilds, function(err, res) {
            if (err) {
                // Display the API error
                chartBuilds.error(err.message);
            } else {
                chartBuilds
                    .parseRequest(this)
                    .title("Builds per branch")
                    .render();
            }
        });
        queryRequests.push(requestBuilds);

        /* Builds per branch */
        // create query
        var queryTotalBuildsBranch = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.build",
            groupBy: "job.branch"
        });
        queriesTimeframe.push(queryTotalBuildsBranch);

        // draw chart
        var chartTotalBuildsBranch = new Keen.Dataviz()
            .el(document.getElementById("chart_total_builds_branch"))
            .height("400")
            .prepare();

        var requestTotalBuildsBranch = client.run(queryTotalBuildsBranch, function(err, res) {
            if (err) {
                // Display the API error
                chartTotalBuildsBranch.error(err.message);
            } else {
                chartTotalBuildsBranch
                    .parseRequest(this)
                    .title("Builds per branch (%)")
                    .render();
            }
        });
        queryRequests.push(requestTotalBuildsBranch);

        /* Build job result */
        // create query
        var queryJobResult = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "job.job",
            groupBy: "job.result"
        });
        queriesTimeframe.push(queryJobResult);
        queriesInterval.push(queryJobResult);

        // draw chart
        var chartJobResult = new Keen.Dataviz()
            .el(document.getElementById("chart_jobs_result"))
            .chartType("columnchart")
            .height("400")
            .attributes({
                chartOptions: {
                    isStacked: true,
                    vAxis: {title: "build job count"}
                },
                colorMapping: {
                    "passed": GREEN,
                    "failed": RED,
                    "errored": YELLOW
                }
            })
            .prepare();

        var requestJobResult = client.run(queryJobResult, function(err, res) {
            if (err) {
                // Display the API error
                chartJobResult.error(err.message);
            } else {
                chartJobResult
                    .parseRequest(this)
                    .title("Build job results")
                    .render();
            }
        });
        queryRequests.push(requestJobResult);

        /* Build job result per branch */

        // set default button
        BuildJobResultClass.resultButtons.setCurrentButton();
        BuildJobResultClass.resultButtons.initButtons();
        BuildJobResultClass.groupByButtons.setCurrentButton();
        BuildJobResultClass.groupByButtons.initButtons();

        // create query
        queryJobResultBranch = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.job",
            groupBy: BuildJobResultClass.getQueryGroupByField(),
            filters: BuildJobResultClass.getFilters()
        });
        queriesTimeframe.push(queryJobResultBranch);

        // draw chart
        chartJobResultBranch = new Keen.Dataviz()
            .el(document.getElementById("chart_jobs_result_branch"))
            .height("400")
            .title(BuildJobResultClass.getTitle())
            .prepare();

        requestJobResultBranch = client.run(queryJobResultBranch, function(err, res) {
            if (err) {
                // Display the API error
                chartJobResultBranch.error(err.message);
            } else {
                chartJobResultBranch
                    .parseRequest(this)
                    .render();
            }
        });
        queryRequests.push(requestJobResultBranch);

        /* Average buildtime per time of day */
        // create query
        var queryAvgBuildtimeHourLastWeek = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_WEEK,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.hour_24",
            filters: [{"property_name":"job.started_at.hour_24","operator":"exists","property_value":true}]
        });
        var queryAvgBuildtimeHourLastMonth = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_MONTH,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.hour_24",
            filters: [{"property_name":"job.started_at.hour_24","operator":"exists","property_value":true}]
        });
        var queryAvgBuildtimeHourLastYear = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_YEAR,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.hour_24",
            filters: [{"property_name":"job.started_at.hour_24","operator":"exists","property_value":true}]
        });

        // create chart
        var chartAvgBuildtimeHour = new Keen.Dataviz()
            .el(document.getElementById("chart_avg_buildtime_hour"))
            .chartType("columnchart")
            .title("Average buildtime per time of day")
            .height("400")
            .attributes({
                chartOptions: {
                    vAxis: { title: "duration [s]" },
                    hAxis: {
                        title: "Time of day [24-hour format, UTC]",
                        slantedText: "true",
                        slantedTextAngle: "90"
                    }
                }
            })
            .prepare();

        // generate chart
        var requestAvgBuildtimeHour = client.run(
                [queryAvgBuildtimeHourLastWeek,
                    queryAvgBuildtimeHourLastMonth,
                    queryAvgBuildtimeHourLastYear],
                function(err, res)
        {
            if (err) {
                // Display the API error
                chartAvgBuildtimeHour.error(err.message);
            } else {
                var timeframeCaptions = [CAPTION_LAST_WEEK, CAPTION_LAST_MONTH, CAPTION_LAST_YEAR];
                var indexCaptions = [];

                // populate array with an entry per hour
                var i;
                for (i = 0; i < 24; i++) {
                    indexCaptions[i]= String(i) + ":00";
                }

                var chartData = mergeSeries(
                    res,
                    indexCaptions,
                    "job.started_at.hour_24",
                    timeframeCaptions
                );

                chartAvgBuildtimeHour
                    .parseRawData({result : chartData})
                    .render();
            }
        });
        queryRequests.push(requestAvgBuildtimeHour);

        /* Average buildtime per day of week */
        // create query
        var queryAvgBuildtimeWeekDayLastWeek = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_WEEK,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.day_of_week",
            filters: [
                {
                    "property_name":"job.started_at.day_of_week",
                    "operator":"exists",
                    "property_value":true
                }
            ]
        });
        var queryAvgBuildtimeWeekDayLastMonth = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_MONTH,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.day_of_week",
            filters: [
                {
                    "property_name":"job.started_at.day_of_week",
                    "operator":"exists",
                    "property_value":true
                }
            ]
        });
        var queryAvgBuildtimeWeekDayLastYear = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: TIMEFRAME_LAST_YEAR,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.started_at.day_of_week",
            filters: [
                {
                    "property_name":"job.started_at.day_of_week",
                    "operator":"exists",
                    "property_value":true
                }
            ]
        });

        // create chart
        var chartAvgBuildtimeWeekDay = new Keen.Dataviz()
            .el(document.getElementById("chart_avg_buildtime_weekday"))
            .chartType("columnchart")
            .title("Average buildtime per day of week")
            .height("400")
            .attributes({
                chartOptions: {
                    vAxis: { title: "duration [s]" },
                    hAxis: { title: "Day of week" }
                }
            })
            .prepare();

        // generate chart
        var requestAvgBuildtimeWeekDay = client.run(
                [queryAvgBuildtimeWeekDayLastWeek,
                    queryAvgBuildtimeWeekDayLastMonth,
                    queryAvgBuildtimeWeekDayLastYear],
                function(err, res)
        {
            if (err) {
                // Display the API error
                chartAvgBuildtimeWeekDay.error(err.message);
            } else {
                var timeframeCaptions = [CAPTION_LAST_WEEK, CAPTION_LAST_MONTH, CAPTION_LAST_YEAR];
                var indexCaptions = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                var chartData = mergeSeries(
                    res,
                    indexCaptions,
                    "job.started_at.day_of_week",
                    timeframeCaptions
                );

                chartAvgBuildtimeWeekDay
                    .parseRawData({result : chartData})
                    .render();
            }
        });
        queryRequests.push(requestAvgBuildtimeWeekDay);
    });
}

// add project name to title
function updateTitle() {
    var title = 'Buildtime Trend as a Service';

    // check if config.projectName is set
    if (!isEmpty(config.projectName) && config.projectName !== 'project_name') {
        title = htmlEntities(config.projectName);
    } else if (!isEmpty(config.repoName) && config.repoName !== 'repo_name') {
        title = htmlEntities(config.repoName);
    }

    document.getElementById("title").innerHTML = title;
    document.getElementsByTagName("title")[0].innerHTML = "Buildtime Trend - " + title;
}

// Initialize link urls
function initLinks() {
    // check if config.serviceUrl is set by something else than the default value
    if (!isEmpty(config.websiteUrl) && config.websiteUrl !== 'website_url') {
        $("#title").attr('href', htmlEntities(config.websiteUrl));
    }

    // link to project repo and display icon
    if (!isEmpty(config.repoName) && config.repoName !== 'repo_name') {
        var repoUrl = "https://github.com/" + config.repoName;
        $("#repo-url").attr('href', htmlEntities(repoUrl));
        $("#repo-url").show();
    } else {
        // hide repo icon
        $("#repo-url").hide();
    }
}

// Display message
function initMessage() {
    // add message and display it
    if (!isEmpty(config.message)) {
        $("#message").append(htmlEntities(config.message));
        $("#message").show();
    } else {
        // hide message
        $("#message").hide();
    }
}

// Populate project menu
function populateProjects() {
    // check if config.projectList is defined
    if (!isEmpty(config.projectList) &&
      $.isArray(config.projectList) && config.projectList.length > 0) {
        var i;
        var projectRepo, projectUrl, badgeUrl, projectLinkDropdown, projectLinkOverview;

        for (i = 0; i < config.projectList.length; i++) {
            projectRepo = htmlEntities(config.projectList[i]);
            projectUrl = "/dashboard/" + projectRepo;
            badgeUrl = getBadgeUrl() + projectRepo;

            // add project link to dropdown menu
            projectLinkDropdown = '<li><a href="' + projectUrl + '">' +
                projectRepo + '</a></li>';
            $("#projects.dropdown ul").append(projectLinkDropdown);

            // add project link to project overview
            projectLinkOverview = '<li class="list-group-item">' +
                '<h4 class="list-group-item-heading">' + projectRepo + '</h4>' +
                '<a role="button" class="btn btn-primary" href="' +
                projectUrl + '">Dashboard</a>' +
                ' <a href="' + projectUrl + '"><img id="badge-url" src="' +
                    badgeUrl + '/latest" alt="Latest Buildtime" /></a>' +
                ' <a href="' + projectUrl + '"><img id="badge-url" src="' +
                    badgeUrl + '/builds" alt="Total Builds" /></a>' +
                ' <a href="' + projectUrl + '"><img id="badge-url" src="' +
                    badgeUrl + '/passed" alt="Successful builds" /></a>' +
                '</li>';
            $("#project-overview").append(projectLinkOverview);
        }

        // show projects dropdown menu
        $("#projects.dropdown").show();
    } else {
        // hide projects dropdown menu
        $("#projects.dropdown").hide();
    }
}

// initialize page
$(document).ready(function() {
    updateTitle();
    initLinks();
    initMessage();
    updateBadgeUrl();
    populateProjects();
    if (!isEmpty(config.repoName) &&
      !isEmpty(keenConfig.projectId) && !isEmpty(keenConfig.readKey)) {
        initCharts();
    }
});
