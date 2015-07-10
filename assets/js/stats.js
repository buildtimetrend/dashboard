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
        /* Builds per project */
        // create query
        var queryBuildsPerProject = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            targetProperty: "job.build",
            groupBy: "buildtime_trend.project_name",
            interval: keenInterval,
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        });
        queriesTimeframe.push(queryBuildsPerProject);
        queriesInterval.push(queryBuildsPerProject);

        // draw chart
        var chartBuildsPerProject = new Keen.Dataviz()
            .el(document.getElementById("chart_builds_per_project"))
            .chartType("columnchart")
            .height("400")
            .attributes({
                chartOptions: {
                    isStacked: true
                }
            })
           .prepare();

        var requestBuildsPerProject = client.run(queryBuildsPerProject, function(err, res) {
            if (err) {
                // Display the API error
                chartBuildsPerProject.error(err.message);
            } else {
                chartBuildsPerProject
                    .parseRequest(this)
                    .title("Builds per project")
                    .render();
            }
        });
        queryRequests.push(requestBuildsPerProject);

        /* Builds per project (piechart)*/
        // create query
        var queryBuildsPerProjectPie = new Keen.Query("count_unique", {
            eventCollection: "build_jobs",
            targetProperty: "job.build",
            groupBy: "buildtime_trend.project_name",
            timeframe: keenTimeframe,
            maxAge: keenMaxAge,
            timezone: TIMEZONE_SECS
        });
        queriesTimeframe.push(queryBuildsPerProjectPie);

        // draw chart
        var chartBuildsPerProjectPie = new Keen.Dataviz()
            .el(document.getElementById("chart_builds_per_project_pie"))
            .height("400")
            .prepare();

        var requestBuildsPerProjectPie = client.run(queryBuildsPerProjectPie, function(err, res) {
            if (err) {
                // Display the API error
                chartBuildsPerProjectPie.error(err.message);
            } else {
                chartBuildsPerProjectPie
                    .parseRequest(this)
                    .title("Builds per project")
                    .render();
            }
        });
        queryRequests.push(requestBuildsPerProjectPie);

    });
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
