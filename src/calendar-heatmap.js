'use strict';

/* globals d3 */

var calendarHeatmap = {

  settings: {
    gutter: 5,
    item_gutter: 1,
    width: 1000,
    height: 200,
    item_size: 10,
    label_padding: 40,
    max_block_height: 20,
    transition_duration: 500,
    tooltip_width: 250,
    tooltip_padding: 15,
  },


  /**
   * Initialize
   */
  init: function (data, color, overview, handler) {

    // Set calendar data
    calendarHeatmap.data = data;

    // Set calendar color
    calendarHeatmap.color = color || '#ff4500';

    // Initialize current overview type and history
    calendarHeatmap.overview = overview || 'global';
    calendarHeatmap.history = ['global'];
    calendarHeatmap.selected = {};

    // Set handler function
    calendarHeatmap.handler = handler;

    // No transition to start with
    calendarHeatmap.in_transition = false;

    // Create html elementsfor the calendar
    calendarHeatmap.createElements();

    // Parse data for summary details
    calendarHeatmap.parseData();

    // Draw the chart
    calendarHeatmap.drawChart();
  },


  /**
   * Create html elements for the calendar
   */
  createElements: function () {
    // Create main html container for the calendar
    var container = document.createElement('div');
    container.className = 'calendar-heatmap';
    document.body.appendChild(container);

    // Create svg element
    var svg = d3.select(container).append('svg')
      .attr('class', 'svg');

    // Create other svg elements
    calendarHeatmap.items = svg.append('g');
    calendarHeatmap.labels = svg.append('g');
    calendarHeatmap.buttons = svg.append('g');

    // Add tooltip to the same element as main svg
    calendarHeatmap.tooltip = d3.select(container).append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0);

    // Calculate dimensions based on available width
    var calcDimensions = function () {

      var dayIndex = Math.round((moment() - moment().subtract(1, 'year').startOf('week')) / 86400000);
      var colIndex = Math.trunc(dayIndex / 7);
      var numWeeks = colIndex + 1;

      calendarHeatmap.settings.width = container.offsetWidth < 1000 ? 1000 : container.offsetWidth;
      calendarHeatmap.settings.item_size = ((calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / numWeeks - calendarHeatmap.settings.gutter);
      calendarHeatmap.settings.height = calendarHeatmap.settings.label_padding + 7 * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter);
      svg.attr({'width': calendarHeatmap.settings.width, 'height': calendarHeatmap.settings.height});

      if ( !!calendarHeatmap.data && !!calendarHeatmap.data[0].summary ) {
        calendarHeatmap.drawChart();
      }
    };
    calcDimensions();

    window.onresize = function(event) {
      calcDimensions();
    };
  },


  /**
   * Parse data for summary in case it was not provided
   */
  parseData: function () {
    if ( !calendarHeatmap.data ) { return; }

    // Get daily summary if that was not provided
    if ( !calendarHeatmap.data[0].summary ) {
      calendarHeatmap.data.map(function (d) {
        var summary = d.details.reduce( function(uniques, project) {
          if ( !uniques[project.name] ) {
            uniques[project.name] = {
              'value': project.value
            };
          } else {
            uniques[project.name].value += project.value;
          }
          return uniques;
        }, {});
        var unsorted_summary = Object.keys(summary).map(function (key) {
          return {
            'name': key,
            'value': summary[key].value
          };
        });
        d.summary = unsorted_summary.sort(function (a, b) {
          return b.value - a.value;
        });
        return d;
      });
    }
  },


  /**
   * Draw the chart based on the current overview type
   */
  drawChart: function () {
    if ( calendarHeatmap.overview === 'global' ) {
      calendarHeatmap.drawGlobalOverview();
    } else if ( calendarHeatmap.overview === 'year' ) {
      calendarHeatmap.drawYearOverview();
    } else if ( calendarHeatmap.overview === 'month' ) {
      calendarHeatmap.drawMonthOverview();
    } else if ( calendarHeatmap.overview === 'week' ) {
      calendarHeatmap.drawWeekOverview();
    } else if ( calendarHeatmap.overview === 'day' ) {
      calendarHeatmap.drawDayOverview();
    }
  },


  /**
   * Draw global overview (multiple years)
   */
  drawGlobalOverview: function () {
    // Add current overview to the history
    if ( calendarHeatmap.history[calendarHeatmap.history.length-1] !== calendarHeatmap.overview ) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define start and end of the dataset
    var start = moment(calendarHeatmap.data[0].date).startOf('year');
    var end = moment(calendarHeatmap.data[calendarHeatmap.data.length-1].date).endOf('year');

    // Define array of years and total values
    var year_data = d3.timeYears(start, end).map(function (d) {
      var date = moment(d);
      return {
        'date': date,
        'total': calendarHeatmap.data.reduce(function (prev, current) {
          if ( moment(current.date).year() === date.year() ) {
            prev += current.total;
          }
          return prev;
        }, 0),
        'summary': function () {
          var summary = calendarHeatmap.data.reduce(function (summary, d) {
            if ( moment(d.date).year() === date.year() ) {
              for ( var i = 0; i < d.summary.length; i++ ) {
                if ( !summary[d.summary[i].name] ) {
                  summary[d.summary[i].name] = {
                    'value': d.summary[i].value,
                  };
                } else {
                  summary[d.summary[i].name].value += d.summary[i].value;
                }
              }
            }
            return summary;
          }, {});
          var unsorted_summary = Object.keys(summary).map(function (key) {
            return {
              'name': key,
              'value': summary[key].value
            };
          });
          return unsorted_summary.sort(function (a, b) {
            return b.value - a.value;
          });
        }(),
      };
    });

    // Calculate max value of all the years in the dataset
    var max_value = d3.max(year_data, function (d) {
      return d.total;
    });

    // Define year labels and axis
    var year_labels = d3.timeYears(start, end).map(function (d) {
      return moment(d);
    });
    var yearScale = d3.scaleBand()
      .rangeRound([0, calendarHeatmap.settings.width])
      .padding([0.05])
      .domain(year_labels.map(function(d) {
        return d.year();
      }));

    // Add month data items to the overview
    calendarHeatmap.items.selectAll('.item-block-year').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-year')
      .data(year_data)
      .enter()
      .append('rect')
      .attr('class', 'item item-block-year')
      .attr('width', function () {
        return (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / year_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function () {
        return calendarHeatmap.settings.height - calendarHeatmap.settings.label_padding;
      })
      .attr('transform', function (d) {
        return 'translate(' + yearScale(d.date.year()) + ',' + calendarHeatmap.settings.tooltip_padding * 2 + ')';
      })
      .attr('fill', function (d) {
        var color = d3.scaleLinear()
          .range(['#ffffff', calendarHeatmap.color || '#ff4500'])
          .domain([-0.15 * max_value, max_value]);
        return color(d.total) || '#ff4500';
      })
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Set in_transition flag
        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all month overview related items and labels
        calendarHeatmap.removeGlobalOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'year';
        calendarHeatmap.drawChart();
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div><span><strong>Total time tracked:</strong></span>';

        var sec = parseInt(d.total, 10);
        var days = Math.floor(sec / 86400);
        if ( days > 0 ) {
          tooltip_html += '<span>' + (days === 1 ? '1 day' : days + ' days') + '</span></div>';
        }
        var hours = Math.floor((sec - (days * 86400)) / 3600);
        if ( hours > 0 ) {
          if ( days > 0 ) {
            tooltip_html += '<div><span></span><span>' + (hours === 1 ? '1 hour' : hours + ' hours') + '</span></div>';
          } else {
            tooltip_html += '<span>' + (hours === 1 ? '1 hour' : hours + ' hours') + '</span></div>';
          }
        }
        var minutes = Math.floor((sec - (days * 86400) - (hours * 3600)) / 60);
        if ( minutes > 0 ) {
          if ( days > 0 || hours > 0 ) {
            tooltip_html += '<div><span></span><span>' + (minutes === 1 ? '1 minute' : minutes + ' minutes') + '</span></div>';
          } else {
            tooltip_html += '<span>' + (minutes === 1 ? '1 minute' : minutes + ' minutes') + '</span></div>';
          }
        }
        tooltip_html += '<br />';

        // Add summary to the tooltip
        if ( d.summary.length <= 5 ) {
          for ( var i = 0; i < d.summary.length; i++ ) {
            tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
            tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
          };
        } else {
          for ( var i = 0; i < 5; i++ ) {
            tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
            tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
          };
          tooltip_html += '<br />';

          var other_projects_sum = 0;
          for ( var i = 5; i < d.summary.length; i++ ) {
            other_projects_sum =+ d.summary[i].value;
          };
          tooltip_html += '<div><span><strong>Other:</strong></span>';
          tooltip_html += '<span>' + calendarHeatmap.formatTime(other_projects_sum) + '</span></div>';
        }

        // Calculate tooltip position
        var x = yearScale(d.date.year()) + calendarHeatmap.settings.tooltip_padding * 2;
        while ( calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 5) ) {
          x -= 10;
        }
        var y = calendarHeatmap.settings.tooltip_padding * 3;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
            .duration(calendarHeatmap.settings.transition_duration / 2)
            .ease(d3.easeLinear)
            .style('opacity', 1);
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
        .delay(function (d, i) {
          return calendarHeatmap.settings.transition_duration * (i + 1) / 10;
        })
        .duration(function () {
          return calendarHeatmap.settings.transition_duration;
        })
        .ease(d3.easeLinear)
        .style('opacity', 1)
        .call(function (transition, callback) {
          if ( transition.empty() ) {
            callback();
          }
          var n = 0;
          transition
            .each(function() { ++n; })
            .on('end', function() {
              if ( !--n ) {
                callback.apply(this, arguments);
              }
            });
          }, function() {
            calendarHeatmap.in_transition = false;
          });

    // Add year labels
    calendarHeatmap.labels.selectAll('.label-year').remove();
    calendarHeatmap.labels.selectAll('.label-year')
      .data(year_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-year')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return d.year();
      })
      .attr('x', function (d) {
        return yearScale(d.year());
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function (year_label) {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-year')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return ( moment(d.date).year() === year_label.year() ) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-year')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Set in_transition flag
        calendarHeatmap.in_transition = true;

        // Set selected month to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeGlobalOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'year';
        calendarHeatmap.drawChart();
      });
  },


  /**
   * Draw year overview
   */
  drawYearOverview: function () {
    // Add current overview to the history
    if ( calendarHeatmap.history[calendarHeatmap.history.length-1] !== calendarHeatmap.overview ) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define start and end date of the selected year
    var start_of_year = moment(calendarHeatmap.selected.date).startOf('year');
    var end_of_year = moment(calendarHeatmap.selected.date).endOf('year');

    // Filter data down to the selected year
    var year_data = calendarHeatmap.data.filter(function (d) {
      return start_of_year <= moment(d.date) && moment(d.date) < end_of_year;
    });

    // Calculate max value of the year data
    var max_value = d3.max(year_data, function (d) {
      return d.total;
    });

    var color = d3.scaleLinear()
      .range(['#ffffff', calendarHeatmap.color || '#ff4500'])
      .domain([-0.15 * max_value, max_value]);

    var calcItemX = function (d) {
      var date = moment(d.date);
      var dayIndex = Math.round((date - moment(start_of_year).startOf('week')) / 86400000);
      var colIndex = Math.trunc(dayIndex / 7);
      return colIndex * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter) + calendarHeatmap.settings.label_padding;
    };
    var calcItemY = function (d) {
      return calendarHeatmap.settings.label_padding + moment(d.date).weekday() * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter);
    };
    var calcItemSize = function (d) {
      if ( max_value <= 0 ) { return calendarHeatmap.settings.item_size; }
      return calendarHeatmap.settings.item_size * 0.75 + (calendarHeatmap.settings.item_size * d.total / max_value) * 0.25;
    };

    calendarHeatmap.items.selectAll('.item-circle').remove();
    calendarHeatmap.items.selectAll('.item-circle')
      .data(year_data)
      .enter()
      .append('rect')
      .attr('class', 'item item-circle')
      .style('opacity', 0)
      .attr('x', function (d) {
        return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
      })
      .attr('y', function (d) {
        return calcItemY(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
      })
      .attr('rx', function (d) {
        return calcItemSize(d);
      })
      .attr('ry', function (d) {
        return calcItemSize(d);
      })
      .attr('width', function (d) {
        return calcItemSize(d);
      })
      .attr('height', function (d) {
        return calcItemSize(d);
      })
      .attr('fill', function (d) {
        return ( d.total > 0 ) ? color(d.total) : 'transparent';
      })
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Don't transition if there is no data to show
        if ( d.total === 0 ) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeYearOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      })
      .on('mouseover', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Pulsating animation
        var circle = d3.select(this);
        (function repeat() {
          circle = circle.transition()
            .duration(calendarHeatmap.settings.transition_duration)
            .ease(d3.easeLinear)
            .attr('x', function (d) {
              return calcItemX(d) - (calendarHeatmap.settings.item_size * 1.1 - calendarHeatmap.settings.item_size) / 2;
            })
            .attr('y', function (d) {
              return calcItemY(d) - (calendarHeatmap.settings.item_size * 1.1 - calendarHeatmap.settings.item_size) / 2;
            })
            .attr('width', calendarHeatmap.settings.item_size * 1.1)
            .attr('height', calendarHeatmap.settings.item_size * 1.1)
            .transition()
            .duration(calendarHeatmap.settings.transition_duration)
            .ease(d3.easeLinear)
            .attr('x', function (d) {
              return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
            })
            .attr('y', function (d) {
              return calcItemY(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
            })
            .attr('width', function (d) {
              return calcItemSize(d);
            })
            .attr('height', function (d) {
              return calcItemSize(d);
            })
            .on('end', repeat);
        })();

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div class="header"><strong>' + (d.total ? calendarHeatmap.formatTime(d.total) : 'No time') + ' tracked</strong></div>';
        tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div><br>';

        // Add summary to the tooltip
        for ( var i = 0; i < d.summary.length; i++ ) {
          tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
          tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
        };

        // Calculate tooltip position
        var x = calcItemX(d) + calendarHeatmap.settings.item_size;
        if ( calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3) ) {
          x -= calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 2;
        }
        var y = calcItemY(d) + calendarHeatmap.settings.item_size;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
            .duration(calendarHeatmap.settings.transition_duration / 2)
            .ease(d3.easeLinear)
            .style('opacity', 1);
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        // Set circle radius back to what it's supposed to be
        d3.select(this).transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .attr('x', function (d) {
            return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
          })
          .attr('y', function (d) {
            return calcItemY(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
          })
          .attr('width', function (d) {
            return calcItemSize(d);
          })
          .attr('height', function (d) {
            return calcItemSize(d);
          });

        // Hide tooltip
        calendarHeatmap.hideTooltip();
      })
      .transition()
        .delay( function () {
          return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
        })
        .duration(function () {
          return calendarHeatmap.settings.transition_duration;
        })
        .ease(d3.easeLinear)
        .style('opacity', 1)
        .call(function (transition, callback) {
          if ( transition.empty() ) {
            callback();
          }
          var n = 0;
          transition
            .each(function() { ++n; })
            .on('end', function() {
              if ( !--n ) {
                callback.apply(this, arguments);
              }
            });
          }, function() {
            calendarHeatmap.in_transition = false;
          });

    // Add month labels
    var month_labels = d3.timeMonths(start_of_year, end_of_year);
    var monthScale = d3.scaleLinear()
      .range([0, calendarHeatmap.settings.width])
      .domain([0, month_labels.length]);
    calendarHeatmap.labels.selectAll('.label-month').remove();
    calendarHeatmap.labels.selectAll('.label-month')
      .data(month_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-month')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return d.toLocaleDateString('en-us', {month: 'short'});
      })
      .attr('x', function (d, i) {
        return monthScale(i) + (monthScale(i) - monthScale(i-1)) / 2;
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        var selected_month = moment(d);
        calendarHeatmap.items.selectAll('.item-circle')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return moment(d.date).isSame(selected_month, 'month') ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-circle')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Check month data
        var month_data = calendarHeatmap.data.filter(function (e) {
          return moment(d).startOf('month') <= moment(e.date) && moment(e.date) < moment(d).endOf('month');
        });

        // Don't transition if there is no data to show
        if ( !month_data.length ) { return; }

        // Set selected month to the one clicked on
        calendarHeatmap.selected = {date: d};

        calendarHeatmap.in_transition = true;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeYearOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'month';
        calendarHeatmap.drawChart();
      });

    // Add day labels
    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(day_labels.map(function (d) {
        return moment(d).weekday();
      }));
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-day')
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function (d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return moment(d).format('dddd')[0];
      })
      .on('mouseenter', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-circle')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-circle')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw month overview
   */
  drawMonthOverview: function () {
    // Add current overview to the history
    if ( calendarHeatmap.history[calendarHeatmap.history.length-1] !== calendarHeatmap.overview ) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define beginning and end of the month
    var start_of_month = moment(calendarHeatmap.selected.date).startOf('month');
    var end_of_month = moment(calendarHeatmap.selected.date).endOf('month');

    // Filter data down to the selected month
    var month_data = calendarHeatmap.data.filter(function (d) {
      return start_of_month <= moment(d.date) && moment(d.date) < end_of_month;
    });
    var max_value = d3.max(month_data, function (d) {
      return d3.max(d.summary, function (d) {
        return d.value;
      });
    });

    // Define day labels and axis
    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(day_labels.map(function (d) {
        return moment(d).weekday();
      }));

    // Define week labels and axis
    var week_labels = [start_of_month.clone()];
    while ( start_of_month.week() !== end_of_month.week() ) {
      week_labels.push(start_of_month.add(1, 'week').clone());
    }
    var weekScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.width])
      .padding([0.05])
      .domain(week_labels.map(function(weekday) {
        return weekday.week();
      }));

    // Add month data items to the overview
    calendarHeatmap.items.selectAll('.item-block-month').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-month')
      .data(month_data)
      .enter()
      .append('g')
      .attr('class', 'item item-block-month')
      .attr('width', function () {
        return (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function () {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('transform', function (d) {
        return 'translate(' + weekScale(moment(d.date).week()) + ',' + ((dayScale(moment(d.date).weekday()) + dayScale.bandwidth() / 1.75) - 15)+ ')';
      })
      .attr('total', function (d) {
        return d.total;
      })
      .attr('date', function (d) {
        return d.date;
      })
      .attr('offset', 0)
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Don't transition if there is no data to show
        if ( d.total === 0 ) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all month overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      });

    var item_width = (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
    var itemScale = d3.scaleLinear()
      .rangeRound([0, item_width]);

    item_block.selectAll('.item-block-rect')
      .data(function (d) {
        return d.summary;
      })
      .enter()
      .append('rect')
      .attr('class', 'item item-block-rect')
      .attr('x', function (d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var offset = parseInt(d3.select(this.parentNode).attr('offset'));
        itemScale.domain([0, total]);
        d3.select(this.parentNode).attr('offset', offset + itemScale(d.value));
        return offset;
      })
      .attr('width', function (d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        itemScale.domain([0, total]);
        return Math.max((itemScale(d.value) - calendarHeatmap.settings.item_gutter), 1)
      })
      .attr('height', function () {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('fill', function (d) {
        var color = d3.scaleLinear()
          .range(['#ffffff', calendarHeatmap.color || '#ff4500'])
          .domain([-0.15 * max_value, max_value]);
        return color(d.value) || '#ff4500';
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Get date from the parent node
        var date = new Date(d3.select(this.parentNode).attr('date'));

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div class="header"><strong>' + d.name + '</strong></div><br>';
        tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' tracked</strong></div>';
        tooltip_html += '<div>on ' + moment(date).format('dddd, MMM Do YYYY') + '</div>';

        // Calculate tooltip position
        var x = weekScale(moment(date).week()) + calendarHeatmap.settings.tooltip_padding;
        while ( calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3) ) {
          x -= 10;
        }
        var y = dayScale(moment(date).weekday()) + calendarHeatmap.settings.tooltip_padding * 2;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
            .duration(calendarHeatmap.settings.transition_duration / 2)
            .ease(d3.easeLinear)
            .style('opacity', 1);
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
        .delay(function () {
          return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
        })
        .duration(function () {
          return calendarHeatmap.settings.transition_duration;
        })
        .ease(d3.easeLinear)
        .style('opacity', 1)
        .call(function (transition, callback) {
          if ( transition.empty() ) {
            callback();
          }
          var n = 0;
          transition
            .each(function() { ++n; })
            .on('end', function() {
              if ( !--n ) {
                callback.apply(this, arguments);
              }
            });
          }, function() {
            calendarHeatmap.in_transition = false;
          });

    // Add week labels
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.labels.selectAll('.label-week')
      .data(week_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-week')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return 'Week ' + d.week();
      })
      .attr('x', function (d) {
        return weekScale(d.week());
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function (weekday) {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return ( moment(d.date).week() === weekday.week() ) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Check week data
        var week_data = calendarHeatmap.data.filter(function (e) {
          return d.startOf('week') <= moment(e.date) && moment(e.date) < d.endOf('week');
        });

        // Don't transition if there is no data to show
        if ( !week_data.length ) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected month to the one clicked on
        calendarHeatmap.selected = { date: d };

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'week';
        calendarHeatmap.drawChart();
      });

    // Add day labels
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-day')
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function (d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return moment(d).format('dddd')[0];
      })
      .on('mouseenter', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw week overview
   */
  drawWeekOverview: function () {
    // Add current overview to the history
    if ( calendarHeatmap.history[calendarHeatmap.history.length-1] !== calendarHeatmap.overview ) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define beginning and end of the week
    var start_of_week = moment(calendarHeatmap.selected.date).startOf('week');
    var end_of_week = moment(calendarHeatmap.selected.date).endOf('week');

    // Filter data down to the selected week
    var week_data = calendarHeatmap.data.filter(function (d) {
      return start_of_week <= moment(d.date) && moment(d.date) < end_of_week;
    });
    var max_value = d3.max(week_data, function (d) {
      return d3.max(d.summary, function (d) {
        return d.value;
      });
    });

    // Define day labels and axis
    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(day_labels.map(function (d) {
        return moment(d).weekday();
      }));

    // Define week labels and axis
    var week_labels = [start_of_week];
    var weekScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.width])
      .padding([0.01])
      .domain(week_labels.map(function (weekday) {
        return weekday.week();
      }));

    // Add week data items to the overview
    calendarHeatmap.items.selectAll('.item-block-week').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-week')
      .data(week_data)
      .enter()
      .append('g')
      .attr('class', 'item item-block-week')
      .attr('width', function () {
        return (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function () {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('transform', function (d) {
        return 'translate(' + weekScale(moment(d.date).week()) + ',' + ((dayScale(moment(d.date).weekday()) + dayScale.bandwidth() / 1.75) - 15)+ ')';
      })
      .attr('total', function (d) {
        return d.total;
      })
      .attr('date', function (d) {
        return d.date;
      })
      .attr('offset', 0)
      .on('click', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Don't transition if there is no data to show
        if ( d.total === 0 ) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all week overview related items and labels
        calendarHeatmap.removeWeekOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      });

    var item_width = (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
    var itemScale = d3.scaleLinear()
      .rangeRound([0, item_width]);

    item_block.selectAll('.item-block-rect')
      .data(function (d) {
        return d.summary;
      })
      .enter()
      .append('rect')
      .attr('class', 'item item-block-rect')
      .attr('x', function (d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var offset = parseInt(d3.select(this.parentNode).attr('offset'));
        itemScale.domain([0, total]);
        d3.select(this.parentNode).attr('offset', offset + itemScale(d.value));
        return offset;
      })
      .attr('width', function (d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        itemScale.domain([0, total]);
        return Math.max((itemScale(d.value) - calendarHeatmap.settings.item_gutter), 1)
      })
      .attr('height', function () {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('fill', function (d) {
        var color = d3.scaleLinear()
          .range(['#ffffff', calendarHeatmap.color || '#ff4500'])
          .domain([-0.15 * max_value, max_value]);
        return color(d.value) || '#ff4500';
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Get date from the parent node
        var date = new Date(d3.select(this.parentNode).attr('date'));

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div class="header"><strong>' + d.name + '</strong></div><br>';
        tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' tracked</strong></div>';
        tooltip_html += '<div>on ' + moment(date).format('dddd, MMM Do YYYY') + '</div>';

        // Calculate tooltip position
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        itemScale.domain([0, total]);
        var x = parseInt(d3.select(this).attr('x')) + itemScale(d.value) / 4 + calendarHeatmap.settings.tooltip_width / 4;
        while ( calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3) ) {
          x -= 10;
        }
        var y = dayScale(moment(date).weekday()) + calendarHeatmap.settings.tooltip_padding * 1.5;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
            .duration(calendarHeatmap.settings.transition_duration / 2)
            .ease(d3.easeLinear)
            .style('opacity', 1);
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
        .delay(function () {
          return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
        })
        .duration(function () {
          return calendarHeatmap.settings.transition_duration;
        })
        .ease(d3.easeLinear)
        .style('opacity', 1)
        .call(function (transition, callback) {
          if ( transition.empty() ) {
            callback();
          }
          var n = 0;
          transition
            .each(function() { ++n; })
            .on('end', function() {
              if ( !--n ) {
                callback.apply(this, arguments);
              }
            });
          }, function() {
            calendarHeatmap.in_transition = false;
          });

    // Add week labels
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.labels.selectAll('.label-week')
      .data(week_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-week')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return 'Week ' + d.week();
      })
      .attr('x', function (d) {
        return weekScale(d.week());
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function (weekday) {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return ( moment(d.date).week() === weekday.week() ) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add day labels
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-day')
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function (d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return moment(d).format('dddd')[0];
      })
      .on('mouseenter', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw day overview
   */
  drawDayOverview: function () {
    // Add current overview to the history
    if ( calendarHeatmap.history[calendarHeatmap.history.length-1] !== calendarHeatmap.overview ) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Initialize selected date to today if it was not set
    if ( !Object.keys(calendarHeatmap.selected).length ) {
        calendarHeatmap.selected = calendarHeatmap.data[calendarHeatmap.data.length - 1];
    }

    var project_labels = calendarHeatmap.selected.summary.map(function (project) {
      return project.name;
    });
    var projectScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(project_labels);

    var itemScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding*2, calendarHeatmap.settings.width])
      .domain([moment(calendarHeatmap.selected.date).startOf('day'), moment(calendarHeatmap.selected.date).endOf('day')]);
    calendarHeatmap.items.selectAll('.item-block').remove();
    calendarHeatmap.items.selectAll('.item-block')
      .data(calendarHeatmap.selected.details)
      .enter()
      .append('rect')
      .attr('class', 'item item-block')
      .attr('x', function (d) {
        return itemScale(moment(d.date));
      })
      .attr('y', function (d) {
        return (projectScale(d.name) + projectScale.bandwidth() / 2) - 15;
      })
      .attr('width', function (d) {
        var end = itemScale(d3.timeSecond.offset(moment(d.date), d.value));
        return Math.max((end - itemScale(moment(d.date))), 1);
      })
      .attr('height', function () {
        return Math.min(projectScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('fill', function () {
        return calendarHeatmap.color || '#ff4500';
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if ( calendarHeatmap.in_transition ) { return; }

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div class="header"><strong>' + d.name + '</strong><div><br>';
        tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' tracked</strong></div>';
        tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY HH:mm') + '</div>';

        // Calculate tooltip position
        var x = d.value * 100 / (60 * 60 * 24) + itemScale(moment(d.date));
        while ( calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3) ) {
          x -= 10;
        }
        var y = projectScale(d.name) + projectScale.bandwidth() / 2 + calendarHeatmap.settings.tooltip_padding / 2;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
            .duration(calendarHeatmap.settings.transition_duration / 2)
            .ease(d3.easeLinear)
            .style('opacity', 1);
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }
        calendarHeatmap.hideTooltip();
      })
      .on('click', function (d) {
        if ( !!calendarHeatmap.handler && typeof calendarHeatmap.handler == 'function' ) {
          calendarHeatmap.handler(d);
        }
      })
      .transition()
        .delay(function () {
          return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
        })
        .duration(function () {
          return calendarHeatmap.settings.transition_duration;
        })
        .ease(d3.easeLinear)
        .style('opacity', 0.5)
        .call(function (transition, callback) {
          if ( transition.empty() ) {
            callback();
          }
          var n = 0;
          transition
            .each(function() { ++n; })
            .on('end', function() {
              if ( !--n ) {
                callback.apply(this, arguments);
              }
            });
          }, function() {
            calendarHeatmap.in_transition = false;
          });

    // Add time labels
    var timeLabels = d3.timeHours(
      moment(calendarHeatmap.selected.date).startOf('day'),
      moment(calendarHeatmap.selected.date).endOf('day')
    );
    var timeScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding*2, calendarHeatmap.settings.width])
      .domain([0, timeLabels.length]);
    calendarHeatmap.labels.selectAll('.label-time').remove();
    calendarHeatmap.labels.selectAll('.label-time')
      .data(timeLabels)
      .enter()
      .append('text')
      .attr('class', 'label label-time')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return moment(d).format('HH:mm');
      })
      .attr('x', function (d, i) {
        return timeScale(i);
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function (d) {
        if ( calendarHeatmap.in_transition ) { return; }

        var selected = itemScale(moment(d));
        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            var start = itemScale(moment(d.date));
            var end = itemScale(moment(d.date).add(d.value, 'seconds'));
            return ( selected >= start && selected <= end ) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 0.5);
      });

    // Add project labels
    calendarHeatmap.labels.selectAll('.label-project').remove();
    calendarHeatmap.labels.selectAll('.label-project')
      .data(project_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-project')
      .attr('x', calendarHeatmap.settings.gutter)
      .attr('y', function (d) {
        return projectScale(d) + projectScale.bandwidth() / 2;
      })
      .attr('min-height', function () {
        return projectScale.bandwidth();
      })
      .style('text-anchor', 'left')
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function (d) {
        return d;
      })
      .each(function () {
        var obj = d3.select(this),
          text_length = obj.node().getComputedTextLength(),
          text = obj.text();
        while (text_length > (calendarHeatmap.settings.label_padding * 1.5) && text.length > 0) {
          text = text.slice(0, -1);
          obj.text(text + '...');
          text_length = obj.node().getComputedTextLength();
        }
      })
      .on('mouseenter', function (project) {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function (d) {
            return (d.name === project) ? 1 : 0.1;
          });
      })
      .on('mouseout', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 0.5);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw the button for navigation purposes
   */
  drawButton: function () {
    calendarHeatmap.buttons.selectAll('.button').remove();
    var button = calendarHeatmap.buttons.append('g')
      .attr('class', 'button button-back')
      .style('opacity', 0)
      .on('click', function () {
        if ( calendarHeatmap.in_transition ) { return; }

        // Set transition boolean
        calendarHeatmap.in_transition = true;

        // Clean the canvas from whichever overview type was on
        if ( calendarHeatmap.overview === 'year' ) {
          calendarHeatmap.removeYearOverview();
        } else if ( calendarHeatmap.overview === 'month' ) {
          calendarHeatmap.removeMonthOverview();
        } else if ( calendarHeatmap.overview === 'week' ) {
          calendarHeatmap.removeWeekOverview();
        } else if ( calendarHeatmap.overview === 'day' ) {
          calendarHeatmap.removeDayOverview();
        }

        // Redraw the chart
        calendarHeatmap.history.pop();
        calendarHeatmap.overview = calendarHeatmap.history.pop();
        calendarHeatmap.drawChart();
      });
    button.append('circle')
      .attr('cx', calendarHeatmap.settings.label_padding / 2.25)
      .attr('cy', calendarHeatmap.settings.label_padding / 2.5)
      .attr('r', calendarHeatmap.settings.item_size / 2);
    button.append('text')
      .attr('x', calendarHeatmap.settings.label_padding / 2.25)
      .attr('y', calendarHeatmap.settings.label_padding / 2.5)
      .attr('dy', function () {
        return Math.floor(calendarHeatmap.settings.width / 100) / 3;
      })
      .attr('font-size', function () {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .html('&#x2190;');
    button.transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 1);
  },


  /**
   * Transition and remove items and labels related to global overview
   */
  removeGlobalOverview: function () {
    calendarHeatmap.items.selectAll('.item-block-year')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
    calendarHeatmap.labels.selectAll('.label-year').remove();
  },


  /**
   * Transition and remove items and labels related to year overview
   */
  removeYearOverview: function () {
    calendarHeatmap.items.selectAll('.item-circle')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-month').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to month overview
   */
  removeMonthOverview: function () {
    calendarHeatmap.items.selectAll('.item-block-month').selectAll('.item-block-rect')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function (d, i) {
        return ( i % 2 === 0) ? - calendarHeatmap.settings.width/3 : calendarHeatmap.settings.width/3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to week overview
   */
  removeWeekOverview: function () {
    calendarHeatmap.items.selectAll('.item-block-week').selectAll('.item-block-rect')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function (d, i) {
        return ( i % 2 === 0) ? - calendarHeatmap.settings.width/3 : calendarHeatmap.settings.width/3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to daily overview
   */
  removeDayOverview: function () {
    calendarHeatmap.items.selectAll('.item-block')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function (d, i) {
        return ( i % 2 === 0) ? - calendarHeatmap.settings.width/3 : calendarHeatmap.settings.width/3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-time').remove();
    calendarHeatmap.labels.selectAll('.label-project').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Helper function to hide the tooltip
   */
  hideTooltip: function () {
    calendarHeatmap.tooltip.transition()
      .duration(calendarHeatmap.settings.transition_duration / 2)
      .ease(d3.easeLinear)
      .style('opacity', 0);
  },


  /**
   * Helper function to hide the back button
   */
  hideBackButton: function () {
    calendarHeatmap.buttons.selectAll('.button')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
  },


  /**
   * Helper function to convert seconds to a human readable format
   * @param seconds Integer
   */
  formatTime: function (seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var time = '';
    if ( hours > 0 ) {
      time += hours === 1 ? '1 hour ' : hours + ' hours ';
    }
    if ( minutes > 0 ) {
      time += minutes === 1 ? '1 minute' : minutes + ' minutes';
    }
    if ( hours === 0 && minutes === 0 ) {
      time = Math.round(seconds) + ' seconds';
    }
    return time;
  },

};
