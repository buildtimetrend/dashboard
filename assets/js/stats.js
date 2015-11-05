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

// Timeframe button constants
var BUTTON_COUNT_NAME = "count";
var BUTTON_COUNT_DEFAULT = "jobs";
var BUTTONS_COUNT = {
    "builds": {
        "caption": "Builds",
        "keenEventCollection": "build_jobs",
        "keenTargetProperty": "job.build"
    },
    "jobs": {
        "caption": "Build jobs",
        "keenEventCollection": "build_jobs",
        "keenTargetProperty": "job.job"
    }
};

var countButtons = new ButtonClass(
    BUTTON_COUNT_NAME,
    BUTTONS_COUNT,
    BUTTON_COUNT_DEFAULT
);
countButtons.onClick = function() { updateCountCharts(); };

var chartBuildsPerProject, chartBuildsPerProjectPie;

function initCharts() {
    // initialize timeframe buttons
    timeframeButtons.initButtons();
    countButtons.initButtons();

    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    var keenMaxAge = updatePeriod.keenMaxAge;
    var keenTimeframe = updatePeriod.keenTimeframe;
    var keenInterval = updatePeriod.keenInterval;

    // get count button target
    var countSettings = countButtons.getCurrentButton();

    // display charts
    $('#charts').show();

    // visualization code goes here
    Keen.ready(function() {
        /* Total unique repos */
        var metricTotalRepos = new ChartClass();

        // create query
        metricTotalRepos.queries.push(new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            targetProperty: "job.repo",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge
        }));
        chartsTimeframe.push(metricTotalRepos);

        // draw chart
        metricTotalRepos.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_unique_repos"))
            .title("Unique repos")
            .width(300)
            .colors([BLUE])
            .attributes({
                chartOptions: {prettyNumber: false}
            })
            .prepare();

        metricTotalRepos.request = client.run(metricTotalRepos.queries, function(err, res){
            if (err) {
                // Display the API error
                metricTotalRepos.chart.error(err.message);
            } else {
                metricTotalRepos.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(metricTotalRepos);

        /* Total build jobs */
        var metricTotalBuildJobs = new ChartClass();

        // create query
        metricTotalBuildJobs.queries.push(new Keen.Query("count", {
            eventCollection: "build_jobs",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge
        }));
        chartsTimeframe.push(metricTotalBuildJobs);

        // draw chart
        metricTotalBuildJobs.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_build_jobs"))
            .title("Total build jobs")
            .width(300)
            .prepare();

        metricTotalBuildJobs.request = client.run(metricTotalBuildJobs.queries, function(err, res){
            if (err) {
                // Display the API error
                metricTotalBuildJobs.chart.error(err.message);
            } else {
                metricTotalBuildJobs.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(metricTotalBuildJobs);

        /* Total sub stages */
        var metricTotalSubStages = new ChartClass();

        // create query
        metricTotalSubStages.queries.push(new Keen.Query("count", {
            eventCollection: "build_substages",
            timezone: TIMEZONE_SECS,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge
        }));
        chartsTimeframe.push(metricTotalSubStages);

        // draw chart
        metricTotalSubStages.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_substages"))
            .title("Total substages")
            .width(300)
            .prepare();

        metricTotalSubStages.request = client.run(metricTotalSubStages.queries, function(err, res){
            if (err) {
                // Display the API error
                metricTotalSubStages.chart.error(err.message);
            } else {
                metricTotalSubStages.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(metricTotalSubStages);

        /* Total events */
        var metricTotalEvents = new ChartClass();

        // draw chart
        metricTotalEvents.chart = new Keen.Dataviz()
            .el(document.getElementById("metric_total_events"))
            .title("Total events")
            .width(300)
            .colors([LAVENDER])
            .prepare();

        // combine result of total build jobs and total substages
        metricTotalEvents.request = client.run(
            metricTotalBuildJobs.queries.concat(metricTotalSubStages.queries),
            function(err, res) {
            if (err) {
                // Display the API error
                metricTotalEvents.chart.error(err.message);
            } else {
                var totalEvents = 0;
                $.each(res, function() {
                    totalEvents += this.result;
                });
                metricTotalEvents.chart
                    .parseRawData({result: totalEvents})
                    .render();
            }
        });
        chartsUpdate.push(metricTotalEvents);

        /* Unique repos */
        var chartUniqueRepos = new ChartClass();

        // create query
        chartUniqueRepos.queries.push(new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            targetProperty: "job.repo",
            interval: keenInterval,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartUniqueRepos);
        chartsInterval.push(chartUniqueRepos);

        // draw chart
        chartUniqueRepos.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_unique_repos"))
            .title("Unique project repositories")
            .chartType("areachart")
            .height(400)
            .prepare();

        chartUniqueRepos.request = client.run(chartUniqueRepos.queries, function(err, res) {
            if (err) {
                // Display the API error
                chartUniqueRepos.chart.error(err.message);
            } else {
                chartUniqueRepos.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(chartUniqueRepos);

        /* Builds per project */
        chartBuildsPerProject = new ChartClass();

        // create query
        chartBuildsPerProject.queries.push(new Keen.Query("count_unique", {
            eventCollection: countSettings.keenEventCollection,
            targetProperty: countSettings.keenTargetProperty,
            groupBy: "buildtime_trend.project_name",
            interval: keenInterval,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartBuildsPerProject);
        chartsInterval.push(chartBuildsPerProject);

        // draw chart
        chartBuildsPerProject.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_builds_per_project"))
            .title(countSettings.caption + " per project")
            .chartType("columnchart")
            .height(400)
            .attributes({
                chartOptions: {
                    isStacked: true
                }
            })
           .prepare();

        chartBuildsPerProject.request = client.run(chartBuildsPerProject.queries, function(err, res) {
            if (err) {
                // Display the API error
                chartBuildsPerProject.chart.error(err.message);
            } else {
                chartBuildsPerProject.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(chartBuildsPerProject);

        /* Builds per project (piechart) */
        chartBuildsPerProjectPie = new ChartClass();

        // create query
        chartBuildsPerProjectPie.queries.push(new Keen.Query("count_unique", {
            eventCollection: countSettings.keenEventCollection,
            targetProperty: countSettings.keenTargetProperty,
            groupBy: "buildtime_trend.project_name",
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartBuildsPerProjectPie);

        // draw chart
        chartBuildsPerProjectPie.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_builds_per_project_pie"))
            .title(countSettings.caption + " per project")
            .height(400)
            .prepare();

        chartBuildsPerProjectPie.request = client.run(chartBuildsPerProjectPie.queries, function(err, res) {
            if (err) {
                // Display the API error
                chartBuildsPerProjectPie.chart.error(err.message);
            } else {
                chartBuildsPerProjectPie.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(chartBuildsPerProjectPie);

        /* Substages per project */
        var chartStagesPerProject = new ChartClass();

        // create query
        chartStagesPerProject.queries.push(new Keen.Query("count", {
            eventCollection: "build_substages",
            groupBy: "buildtime_trend.project_name",
            interval: keenInterval,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartStagesPerProject);
        chartsInterval.push(chartStagesPerProject);

        // draw chart
        chartStagesPerProject.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stages_per_project"))
            .title("Substages per project")
            .chartType("columnchart")
            .height(400)
            .attributes({
                chartOptions: {
                    isStacked: true
                }
            })
           .prepare();

        chartStagesPerProject.request = client.run(chartStagesPerProject.queries, function(err, res) {
            if (err) {
                // Display the API error
                chartStagesPerProject.charterror(err.message);
            } else {
                chartStagesPerProject.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(chartStagesPerProject);

        /* Substages per project (piechart)*/
        var chartStagesPerProjectPie = new ChartClass();

        // create query
        chartStagesPerProjectPie.queries.push(new Keen.Query("count", {
            eventCollection: "build_substages",
            groupBy: "buildtime_trend.project_name",
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartStagesPerProjectPie);

        // draw chart
        chartStagesPerProjectPie.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_stages_per_project_pie"))
            .title("Substages per project")
            .height(400)
            .prepare();

        chartStagesPerProjectPie.request = client.run(chartStagesPerProjectPie.queries, function(err, res) {
            if (err) {
                // Display the API error
                chartStagesPerProjectPie.chart.error(err.message);
            } else {
                chartStagesPerProjectPie.chart
                    .parseRequest(this)
                    .render();
            }
        });
        chartsUpdate.push(chartStagesPerProjectPie);

        /* Total events per project (piechart)*/
        var chartEventsPerProjectPie = new ChartClass();

        // draw chart
        chartEventsPerProjectPie.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_total_events_pie"))
            .title("Total events per project")
            .height(400)
            .prepare();

        chartEventsPerProjectPie.request = client.run(
            chartStagesPerProject.queries.concat(chartBuildsPerProject.queries),
            function(err, res) {
            if (err) {
                // Display the API error
                chartEventsPerProjectPie.chart.error(err.message);
            } else {
                /* TODO merge series
                var totalEvents = 0;
                $.each(res, function() {
                    totalEvents += this.result;
                });*/
                chartEventsPerProjectPie.chart
                    .parseRequest(this)
                    //.parseRawData({result: totalEvents})
                    .render();
            }
        });
        chartsUpdate.push(chartEventsPerProjectPie);
    });
}

/**
 * Refresh count charts eventCollection and targetProperty selected by countButtons.
 */
function updateCountCharts() {
  // get count button target
  var countSettings = countButtons.getCurrentButton();

  // update queries
  chartBuildsPerProject.queries[0].set({
    eventCollection: countSettings.keenEventCollection,
    targetProperty: countSettings.keenTargetProperty
  });
  chartBuildsPerProjectPie.queries[0].set({
    eventCollection: countSettings.keenEventCollection,
    targetProperty: countSettings.keenTargetProperty
  });

  chartBuildsPerProject.chart.title(countSettings.caption + " per project");
  chartBuildsPerProjectPie.chart.title(countSettings.caption + " per project");

  // refresh all query requests
  chartBuildsPerProject.request.refresh();
  chartBuildsPerProjectPie.request.refresh();
}

// initialize page
$(document).ready(function() {
    updateTitle();
    initLinks();
    initMessage();
    populateProjects();

    if (!isEmpty(keenConfig.projectId) && !isEmpty(keenConfig.readKey)) {
        initCharts();
    }
});
