/* vim: set expandtab sw=4 ts=4: */
/**
 * Chart Class.
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

/**
 * Chart class.
 *
 * This class groups a few required components to create a query based chart :
 *  - query
 *  - chart
 *  - request
 */
function ChartClass() {
    this.queries = [];
    this.chart = null;
    this.request = null;
    this.filters = [];

    // Set default button
    this.updateFilters = function (filters, refresh) {
        // assign default value
        refresh = defaultValue(refresh, true);

        // merge filters with chart filter
        filters = this.filters.concat(filters);

        // loop over all queries to update filters
        $.each(this.queries, function() {
            this.set({
                filters: filters
            });
        });

        if (refresh) {
            this.request.refresh();
        }
    };
}
