# Calendar heatmap graph

This [d3.js](https://d3js.org/) heatmap representing time series data is used to visualize tracked time over the past year, showing details for each of the days on demand.

Includes visualization of year, month, week and day overview.  

Inspired by [Github's contribution graph](https://help.github.com/articles/viewing-contributions-on-your-profile/#contributions-calendar)

Based on [Calendar View](https://bl.ocks.org/mbostock/4063318) by [Mike Bostock](https://github.com/mbostock)

Aaand [D3.js Calendar Heatmap](https://github.com/DKirwan/calendar-heatmap) by [Darragh Kirwan](https://github.com/DKirwan) 

## Demo
Click <a href="https://rawgit.com/g1eb/calendar-heatmap/master/" target="_blank">here</a> for a live demo.

### Year overview
[![calendar heatmap - year overview](https://raw.githubusercontent.com/g1eb/calendar-heatmap/master/images/screenshot_year_overview.png)](https://rawgit.com/g1eb/calendar-heatmap/master/)

### Month overview
[![calendar heatmap - month overview](https://raw.githubusercontent.com/g1eb/calendar-heatmap/master/images/screenshot_month_overview.png)](https://rawgit.com/g1eb/calendar-heatmap/master/)

### Week overview
[![calendar heatmap - week overview](https://raw.githubusercontent.com/g1eb/calendar-heatmap/master/images/screenshot_week_overview.png)](https://rawgit.com/g1eb/calendar-heatmap/master/)

### Day overview
[![calendar heatmap - day overview](https://raw.githubusercontent.com/g1eb/calendar-heatmap/master/images/screenshot_day_overview.png)](https://rawgit.com/g1eb/calendar-heatmap/master/)

## Installation

- Install 'calendar-heatmap-graph' with bower

```
bower install calendar-heatmap-graph
```

- Install 'calendar-heatmap-graph' with npm

```
npm install calendar-heatmap-graph
```

- Or include files directly in your html:

```
<link rel="stylesheet" type="text/css" href="dist/calendar-heatmap.min.css">
<script src="dist/calendar-heatmap.min.js"></script>
```

### Properties

|Property        | Usage           | Default  | Required |
|:------------- |:-------------|:-----:|:-----:|
| data | Time series data from max a year back | none | yes |
| color | Theme hex color | #45ff00 | no |
| overview | Initial overview type (choices are: year, month, day) | year | no |
| handler | Handler function is fired on click of a time entry in daily overview | none | no |

### Example data

Time series data for each day going 1 year back.
Each day has a total time tracked (in seconds).
Details, if provided, are shown in a tooltip as well as in daily overview.

```
var data = [{
  "date": "2016-01-01",
  "total": 17164,
  "details": [{
    "name": "Project 1",
    "date": "2016-01-01 12:30:45",
    "value": 9192
  }, {
    "name": "Project 2",
    "date": "2016-01-01 13:37:00",
    "value": 6753
  },
  .....
  {
    "name": "Project N",
    "date": "2016-01-01 17:52:41",
    "value": 1219
  }]
}]
```

### Optimization

In some cases details array could be large and in order to fit the data into the tooltip a short summary is generated with distinct projects and their total tracked time for that date.
In terms of optimization summary data can be computed server-side and passed in using the ``summary'' attribute.
And in addition to the data structure described above this would result in a summary dictionary with distinct project names and total values of tracked time in seconds, e.g.:

```
var data = [{
  "date": "2016-01-01",
  "total": 17164,
  "details": [.....],
  "summary": [{
    "name": "Project 1",
    "value": 9192
  }, {
    "name": "Project 2",
    "value": 6753
  },
  .....
  {
    "name": "Project N",
    "value": 1219
  }]
}]
```

See [index.html](https://github.com/g1eb/calendar-heatmap/blob/master/index.html) for an example implementation with random data or click <a href="https://rawgit.com/g1eb/calendar-heatmap/master/" target="_blank">here</a> for a live demo.

## AngularJS Directive

[Calendar heatmap graph angular directive](https://github.com/g1eb/angular-calendar-heatmap)

## Dependencies

* [d3.js](https://d3js.org/)
* [moment.js](http://momentjs.com/)
