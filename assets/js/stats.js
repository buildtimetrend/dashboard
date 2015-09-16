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
var BUTTON_COUNT_PREFIX = "count_";
var BUTTON_COUNT_DEFAULT = "builds";
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
    BUTTONS_COUNT,
    BUTTON_COUNT_DEFAULT,
    BUTTON_COUNT_PREFIX
);
countButtons.onClick = function() { updateCountCharts(); };

var chartBuildsPerProject, chartBuildsPerProjectPie;

function initCharts() {
    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    // initialize timeframe buttons
    timeframeButtons.initButtons();
    countButtons.initButtons();

    var keenMaxAge = updatePeriod.keenMaxAge;
    var keenTimeframe = updatePeriod.keenTimeframe;
    var keenInterval = updatePeriod.keenInterval;

    // display charts
    $('#charts').show();

    // visualization code goes here
    Keen.ready(function() {
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
            .el(document.getElementById("metric_total_builds"))
            .title("Total build jobs")
            .width(200)
            .attributes({
                chartOptions: {prettyNumber: false}
            })
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

        /* Builds per project */
        chartBuildsPerProject = new ChartClass();

        // create query
        chartBuildsPerProject.queries.push(new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            targetProperty: "job.build",
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
            .title("Builds per project")
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
            eventCollection: "build_jobs",
            targetProperty: "job.build",
            groupBy: "buildtime_trend.project_name",
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        }));
        chartsTimeframe.push(chartBuildsPerProjectPie);

        // draw chart
        chartBuildsPerProjectPie.chart = new Keen.Dataviz()
            .el(document.getElementById("chart_builds_per_project_pie"))
            .title("Builds per project")
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
    });
}

/**
 * Refresh count charts eventCollection and targetProperty selected by countButtons.
 */
function updateCountCharts() {
  // get Update Period settings
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
