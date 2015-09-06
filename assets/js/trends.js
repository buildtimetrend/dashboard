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

// define the general onClick event for timeframeButtons instance
timeframeButtons.onClick = function() {
    updateCharts();
    updateBadgeUrl();
};

filterOptions = [
    {
        "selectId": "filter_build_matrix",
        "queryField": "job.build_matrix.summary",
        "keenEventCollection": "build_jobs",
        "caption": "Build matrix"
    },
    {
        "selectId": "filter_result",
        "queryField": "job.result",
        "keenEventCollection": "build_jobs",
        "caption": "Build results"
    },
    {
        "selectId": "filter_build_trigger",
        "queryField": "job.build_trigger",
        "keenEventCollection": "build_jobs",
        "caption": "Build triggers"
    },
    {
        "selectId": "filter_branch",
        "queryField": "job.branch",
        "keenEventCollection": "build_jobs",
        "caption": "Branch"
    }
];

// use Keen JS API default colors :
// https://github.com/keen/keen-js/blob/master/src/dataviz/dataviz.js#L48
var GREEN = '#73d483';
var RED = '#fe6672';
var YELLOW = '#eeb058';

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

/**
 * Format duration from seconds to hours, minutes and seconds.
 *
 * Parameters:
 *  - duration : duration in seconds
 */
function formatDuration(duration) {
    if (isNaN(duration) || duration < 0) {
        return "unknown";
    }

    // round duration
    duration = Math.round(duration);

    var seconds = duration % 60;
    duration = duration / 60;
    var formattedString = seconds.toFixed(0) + "s";

    if (duration >= 1) {
        var minutes = Math.floor(duration % 60);
        duration = duration / 60;
        formattedString = minutes + "m " + formattedString;

        if (duration >= 1) {
            var hours = Math.floor(duration % 60);
            formattedString = hours + "h " + formattedString;
        }
    }

    return formattedString;
}

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
        }))
    ;

    var querySelectUnique = new Keen.Query("select_unique", {
      eventCollection: filterParams.keenEventCollection,
      targetProperty: filterParams.queryField,
      timeframe: updatePeriod.keenTimeframe
    });

    // Send query
    client.run(querySelectUnique, function(err, response){
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

// Initialize badge url
function updateBadgeUrl() {
    var badgeUrl = getBadgeUrl();

    // add repo
    if (!isEmpty(config.repoName) && config.repoName !== 'repo_name') {
        badgeUrl += config.repoName;

        var updatePeriod = getUpdatePeriod();
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

function initCharts() {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // initialize timeframe buttons
    timeframeButtons.initButtons();

    var keenMaxAge = updatePeriod.keenMaxAge;
    var keenTimeframe = updatePeriod.keenTimeframe;
    var keenInterval = updatePeriod.keenInterval;

    // display charts
    $('#charts').show();

    // visualization code goes here
    Keen.ready(function() {
        // initialise filter option buttons
        createFilterOptions();

        /* Total build jobs */
        var metricTotalBuildJobs = new ChartClass();

        // create query
        metricTotalBuildJobs.query = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge
        });
        queriesTimeframe.push(metricTotalBuildJobs.query);

        // draw chart
        metricTotalBuildJobs.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds"))
            .title("Total build jobs")
            .width(200)
            .attributes({
                chartOptions: {prettyNumber: false}
            })
            .prepare();

        metricTotalBuildJobs.request = client.run(metricTotalBuildJobs.query, function(err, res){
            if (err) {
            // Display the API error
            metricTotalBuildJobs.chart.error(err.message);
            } else {
                metricTotalBuildJobs.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(metricTotalBuildJobs);

        /* Total builds passed */
        var metricTotalBuildJobsPassed = new ChartClass();

        metricTotalBuildJobsPassed.filters = [
            {
                "property_name": "job.result",
                "operator": "eq",
                "property_value":"passed"
            }
        ];

        // create query
        metricTotalBuildJobsPassed.query = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            filters: metricTotalBuildJobsPassed.filters
        });
        queriesTimeframe.push(metricTotalBuildJobsPassed.query);

        // create chart
        metricTotalBuildJobsPassed.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds_passed"))
            .title("Build jobs passed")
            .attributes({
                chartOptions: {prettyNumber: false}
            })
            .width(200)
            .prepare();

        // combine queries for conditional coloring of TotalBuildspassed
        metricTotalBuildJobsPassed.request = client.run(
            [metricTotalBuildJobs.query, metricTotalBuildJobsPassed.query],
            function(err, res) {
            if (err) {
                // Display the API error
                metricTotalBuildJobsPassed.chart.error(err.message);
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
                metricTotalBuildJobsPassed.chart
                    .parseRawData({result: totalBuildsPassed})
                    .colors(chartColor)
                    .render();
            }
        });
        charts.push(metricTotalBuildJobsPassed);

        /* Total builds failed */
        var metricTotalBuildJobsFailed = new ChartClass();

        metricTotalBuildJobsFailed.filters = [
            {
                "property_name": "job.result",
                "operator": "in",
                "property_value": ["failed","errored"]
            }
        ];

        // create query
        metricTotalBuildJobsFailed.query = new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            filters: metricTotalBuildJobsFailed.filters
        });
        queriesTimeframe.push(metricTotalBuildJobsFailed.query);

        // create chart
        metricTotalBuildJobsFailed.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_builds_failed"))
            .title("Build jobs failed")
            .attributes({
                chartOptions: {prettyNumber: false}
            })
            .width(200)
            .prepare();

        // combine queries for conditional coloring of TotalBuildsfailed
        metricTotalBuildJobsFailed.request= client.run(
            [metricTotalBuildJobs.query, metricTotalBuildJobsFailed.query],
            function(err, res) {
            if (err) {
                // Display the API error
                metricTotalBuildJobsFailed.chart.error(err.message);
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
                metricTotalBuildJobsFailed.chart
                    .parseRawData({result: totalBuildsFailed})
                    .colors(chartColor)
                    .render();
            }
        });
        charts.push(metricTotalBuildJobsFailed);

        /* average build time of all stages */
        var metricAverageBuildTime = new ChartClass();

        // create query
        metricAverageBuildTime.query = new Keen.Query("average", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.duration"
        });
        queriesTimeframe.push(metricAverageBuildTime.query);

        // draw chart
        metricAverageBuildTime.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_average_build_time"))
            .title("Average job duration")
            .width(300)
            .attributes({
                chartOptions: {
                    suffix: " min"
                }
            })
            .prepare();

        metricAverageBuildTime.request = client.run(metricAverageBuildTime.query, function(err, res) {
            if (err) {
                // Display the API error
                metricAverageBuildTime.chart.error(err.message);
            } else {
                res.result = Math.round(res.result / 60);
                metricAverageBuildTime.chart
                    .parseRawData(res)
                    .render();
            }
        });
        charts.push(metricAverageBuildTime);

        /* average stage duration */
        var chartStageDuration = new ChartClass();

        chartStageDuration.filters = [{"property_name":"stage.name","operator":"exists","property_value":true}];

        // create query
        chartStageDuration.query = new Keen.Query("average", {
            eventCollection: "build_substages",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "stage.duration",
            groupBy: "stage.name",
            filters: chartStageDuration.filters
        });
        queriesTimeframe.push(chartStageDuration.query);
        queriesInterval.push(chartStageDuration.query);


        // draw chart
        chartStageDuration.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_duration"))
            .title("Average build stage duration")
            .chartType("columnchart")
            .height(400)
            .attributes({
                chartOptions: {
                    isStacked: true,
                    vAxis: {title: "duration [s]"}
                }
            })
            .prepare();

        chartStageDuration.request = client.run(chartStageDuration.query, function(err, res) {
            if (err) {
                // Display the API error
                chartStageDuration.chart.error(err.message);
            } else {
                chartStageDuration.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartStageDuration);

        /* Stage duration fraction */
        var chartStageFraction = new ChartClass();

        chartStageFraction.filters = [{"property_name":"stage.name","operator":"exists","property_value":true}];

        // create query
        chartStageFraction.query = new Keen.Query("average", {
            eventCollection: "build_substages",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "stage.duration",
            groupBy: "stage.name",
            filters: chartStageDuration.filters
        });
        queriesTimeframe.push(chartStageFraction.query);

        // draw chart
        chartStageFraction.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_fraction"))
            .title("Build stage fraction of total build duration")
            .height(400)
            .prepare();

        chartStageFraction.request = client.run(chartStageFraction.query, function(err, res) {
            if (err) {
                // Display the API error
                chartStageFraction.chart.error(err.message);
            } else {
                chartStageFraction.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartStageFraction);

        /* Total build duration grouped by build ID */
        var chartStageDurationBuild = new ChartClass();

        // create query
        chartStageDurationBuild.query = new Keen.Query("sum", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.build"
        });
        queriesTimeframe.push(chartStageDurationBuild.query);

        // draw chart
        chartStageDurationBuild.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_duration_build"))
            .chartType("columnchart")
            .title("Total build duration grouped by build ID")
            .height(400)
            .attributes({
                chartOptions: {
                    legend: {position: "none"},
                    vAxis: {title: "duration [s]"},
                    hAxis: {title: "build ID"}
                }
            })
            .prepare();

        chartStageDurationBuild.request = client.run(chartStageDurationBuild.query, function(err, res) {
            if (err) {
                // Display the API error
                chartStageDurationBuild.chart.error(err.message);
            } else {
                chartStageDurationBuild.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartStageDurationBuild);

        /* Total build job duration grouped by build job ID */
        var chartStageDurationBuildJob = new ChartClass();

        // create query
        chartStageDurationBuildJob.query = new Keen.Query("sum", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.duration",
            groupBy: "job.job"
        });
        queriesTimeframe.push(chartStageDurationBuildJob.query);

        // draw chart
        chartStageDurationBuildJob.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stage_duration_buildjob"))
            .chartType("columnchart")
            .title("Total build job duration grouped by build job ID")
            .height(400)
            .attributes({
                chartOptions: {
                    legend: {position: "none"},
                    vAxis: {title: "duration [s]"},
                    hAxis: {title: "build job ID"}
                }
            })
            .prepare();

        chartStageDurationBuildJob.request = client.run(chartStageDurationBuildJob.query, function(err, res) {
            if (err) {
                // Display the API error
                chartStageDurationBuildJob.chart.error(err.message);
            } else {
                chartStageDurationBuildJob.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartStageDurationBuildJob);

        /* Builds per branch */
        var chartBuildsPerBranch = new ChartClass();

        // create query
        chartBuildsPerBranch.query = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "job.build",
            groupBy: "job.branch"
        });
        queriesTimeframe.push(chartBuildsPerBranch.query);
        queriesInterval.push(chartBuildsPerBranch.query);

        // draw chart
        chartBuildsPerBranch.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_builds"))
            .title("Builds per branch")
            .chartType("columnchart")
            .height(400)
            .attributes({
                chartOptions: {
                    isStacked: true,
                    vAxis: {title: "build count"}
                }
            })
            .prepare();

        chartBuildsPerBranch.request = client.run(chartBuildsPerBranch.query, function(err, res) {
            if (err) {
                // Display the API error
                chartBuildsPerBranch.chart.error(err.message);
            } else {
                chartBuildsPerBranch.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartBuildsPerBranch);

        /* Builds per branch */
        var chartTotalBuildsBranch = new ChartClass();

        // create query
        chartTotalBuildsBranch.query = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.build",
            groupBy: "job.branch"
        });
        queriesTimeframe.push(chartTotalBuildsBranch.query);

        // draw chart
        chartTotalBuildsBranch.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_total_builds_branch"))
            .title("Builds per branch (%)")
            .height(400)
            .prepare();

        chartTotalBuildsBranch.request = client.run(chartTotalBuildsBranch.query, function(err, res) {
            if (err) {
                // Display the API error
                chartTotalBuildsBranch.chart.error(err.message);
            } else {
                chartTotalBuildsBranch.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartTotalBuildsBranch);

        /* Build job result */
        var chartJobResult = new ChartClass();

        // create query
        chartJobResult.query = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            interval: keenInterval,
            maxAge: keenMaxAge,
            targetProperty: "job.job",
            groupBy: "job.result"
        });
        queriesTimeframe.push(chartJobResult.query);
        queriesInterval.push(chartJobResult.query);

        // draw chart
        chartJobResult.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_jobs_result"))
            .title("Build job results")
            .chartType("columnchart")
            .height(400)
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

        chartJobResult.request = client.run(chartJobResult.query, function(err, res) {
            if (err) {
                // Display the API error
                chartJobResult.chart.error(err.message);
            } else {
                chartJobResult.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartJobResult);

        /* Build job result per branch */
        var chartJobResultMatrix = new ChartClass();

        chartJobResultMatrix.filters = [
            {
                "property_name": "job.build_matrix.summary",
                "operator": "exists",
                "property_value": true
            }
        ];

        // create query
        chartJobResultMatrix.query = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            targetProperty: "job.job",
            groupBy: "job.build_matrix.summary",
            filters: chartJobResultMatrix.filters
        });
        queriesTimeframe.push(chartJobResultMatrix.query);

        // draw chart
        chartJobResultMatrix.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_jobs_result_branch"))
            .height(400)
            .title("Build jobs grouped by build matrix parameters")
            .prepare();

        chartJobResultMatrix.request = client.run(chartJobResultMatrix.query, function(err, res) {
            if (err) {
                // Display the API error
                chartJobResultMatrix.chart.error(err.message);
            } else {
                chartJobResultMatrix.chart
                    .parseRequest(this)
                    .render();
            }
        });
        charts.push(chartJobResultMatrix);

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
            .height(400)
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
            .height(400)
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
        setAutoRefresh();
    }
});
