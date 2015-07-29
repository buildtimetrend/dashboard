Buildtime Trend dashboard
=========================

Visualise what's trending in your build process

[![Buildtime Trend dashboard](http://img.shields.io/badge/release-v0.2-blue.svg)](https://github.com/buildtimetrend/dashboard/releases/latest)
[![Buildtime Trend dashboard (dev)](http://img.shields.io/badge/dev-v0.3.dev-blue.svg)](https://github.com/buildtimetrend/dashboard/zipball/master)
[![Codacy Badge](https://www.codacy.com/project/badge/78c7e443c0af4e68b4ecc491b9fd304e)](https://www.codacy.com/public/ruleant/dashboard)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/buildtimetrend/dashboard/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/buildtimetrend/dashboard/?branch=master)

## Description

Dashboard with charts and trends of build data gathered by [Python Client](https://github.com/buildtimetrend/python-client) or [Buildtime Trend as a Service](https://github.com/buildtimetrend/service).
This dashboard is part of Buildtime Trend as a Service, it is deployed by the Python Client, or it can be used stand alone.

## Available charts and metrics
  - number of builds, successful and failed
  - average build duration
  - chart with duration of individual build stages
  - chart with builds per branch
  - charts with build duration per time of day/day of week

You can [see it in action](http://buildtimetrend.herokuapp.com/dashboard/buildtimetrend/python-lib/index.html)!

## How to get it?

The [latest version](https://github.com/buildtimetrend/dashboard/releases/latest) is available for download as zip and tarball on GitHub. Unzip and copy to the desired directory.

If you prefer to use git, several options are available :

- development version : `git clone https://github.com/buildtimetrend/dashboard.git`
- latest release : `git clone https://github.com/buildtimetrend/dashboard.git --branch release`
- a specific release : `git clone https://github.com/buildtimetrend/dashboard.git --branch v0.2`

## Usage

The dashboard is hosted on [Buildtime Trend as a Service](http://buildtimetrend.herokuapp.com/dashboard/).
When you setup the Python Client as part of your build process, it will [deploy the dashboard to the github pages of your project](https://github.com/buildtimetrend/python-client#integrate-with-travis-ci).

To install a standalone version :

- download the project and copy the project to a folder on your website, see [How to get it?](#how-to-get-it)
- copy `config_sample.js` to `config.js` and adjust it to your needs :

```JavaScript
 keenConfig = {
    projectId: "keen_project_id", // required
    readKey: "keen_read_key" // required
};

var config = {
    projectName: "project_name", // descriptive project name (used in the title), optional
    repoName: "repo_name", // repo name, fe. "buildtimetrend/python-client"
    serviceUrl: "service_url", // url to Buildtime Trend as a Service, fe. https://buildtimetrend-dev.herokuapp.com/, optional
    websiteUrl: "website_url", // url to project website, optional
    projectList: [] // list of repoNames of other projects hosted on the same website, optional
};
```

### Url parameters

- refresh : leave empty, or set to '0' to disable auto refreshing the charts. If url parameter `refresh` is defined and set to a positive integer value, auto refreshing the charts is enabled. `refresh` is defined in minutes, so a value of 10 will refresh the charts every 10 minutes. The refresh rate should at least be equal to maximum age of the Query cache, if it is less the cache max age value will be used (typically, 10 min).

Bugs and feature requests
-------------------------

Please report bugs and add feature requests in the Github [issue tracker](https://github.com/buildtimetrend/python-lib/issues).


Credits
-------

For an overview of who contributed to create Buildtime trend, see [Credits](https://github.com/buildtimetrend/python-lib/wiki/Credits).

Contact
-------

Project website : https://buildtimetrend.github.io/

Mailinglist : [Buildtime Trend Community](https://groups.google.com/d/forum/buildtimetrend-dev)

Follow us on [Twitter](https://twitter.com/buildtime_trend), [Github](https://github.com/buildtimetrend/python-client) and [OpenHub](https://www.openhub.net/p/buildtime-trend).


License
-------

Copyright (C) 2014-2015 Dieter Adriaenssens <ruleant@users.sourceforge.net>

This software was originally released under GNU General Public License
version 3 or any later version, all commits contributed from
12th of November 2014 on, are contributed as GNU Affero General Public License.
Hence the project is considered to be GNU Affero General Public License
from 12th of November 2014 on.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
