
// (It's CSV, but GitHub Pages only gzip's JSON at the moment.)
d3.csv("http://localhost:8000/static/js/vanzari_cu_cat.json", function(flights) {

  // Various formatters.
  var formatNumber = d3.format("d"),
      formatFloat = d3.format("f"),
      formatDate = d3.time.format("%B %d, %Y"),
      formatTime = d3.time.format("%I:%M %p");

  // A nest operator, for grouping the flight list.
  var nestByDate = d3.nest()
      .key(function(d) { return d3.time.day(d.date); });

  // A little coercion, since the CSV is untyped.
  flights.forEach(function(d, i) {
    d.index = i;
    d.date = parseDate(d.datetime);
    d.valoare = +d.valoare;
    d.pret = +d.pret;
    d.nrfact = +d.nrfact;
    d.pret = +d.pret;
  });

  // Create the crossfilter for the relevant dimensions and groups.
  var flight = crossfilter(flights),
      all = flight.groupAll(),
      date = flight.dimension(function(d) { return d3.time.day(d.date); }),
      dates = date.group().reduceSum(function(d) { return d.valoare; }),
      hour = flight.dimension(function(d) { return d.date.getHours() ; }),
      hours = hour.group().reduceSum(function(d) { return d.valoare; }),
      valoare = flight.dimension(function(d) { return Math.floor(d.valoare/5) * 5; }),
      valori = valoare.group(),
      pret = flight.dimension(function(d) { return Math.floor(d.pret / 10) * 10; }),
      preturi = pret.group().reduceSum(function(d) { return d.valoare; }),
      nrfact = flight.dimension(function(d) { return d.nrfact; }),
      nrfacts = nrfact.group();



  var charts = [

    barChart()
        .dimension(hour)
        .group(hours)
      .x(d3.scale.linear()
        .domain([6, 22])
        .rangeRound([0, 10 * 24])),

    barChart()
        .dimension(pret)
        .group(preturi)
      .x(d3.scale.linear()
        .domain([0, 150])
        .rangeRound([0, 10 * 20])),

    barChart()
        .dimension(valoare)
        .group(valori)
      .x(d3.scale.linear()
        .domain([0, 100])
        .rangeRound([0, 10 * 20])),

    barChart()
        .dimension(date)
        .group(dates)
        .round(d3.time.day)
      .x(d3.time.scale()
        .domain([new Date(2011, 3, 1), new Date(2011, 4, 25)])
        .rangeRound([0, 10 * 80]))
        .filter([new Date(2011, 4, 1), new Date(2011, 4, 21)])

  ];

  // Given our array of charts, which we assume are in the same order as the
  // .chart elements in the DOM, bind the charts to the DOM and render them.
  // We also listen to the chart's brush events to update the display.
  var chart = d3.selectAll(".chart")
      .data(charts)
      .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

  // Render the initial lists.
  var list = d3.selectAll(".list")
      .data([flightList]);

  renderAll();

  // Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
      var totalvanzari = all.reduceSum(function(d){return d.valoare}).value(),
          nrvanzari = nrfacts.all().reduce(function(previousValue, currentValue, index, array){return currentValue.value>0?previousValue + 1:previousValue ;}, 0),
          medie = totalvanzari/nrvanzari;
    chart.each(render);
    list.each(render);

    x = formatFloat(totalvanzari).length;

    d3.select("#valoarevanzari").text(formatFloat(totalvanzari)).style('font-size', d3.min([24,120/x])+'px');
    d3.select("#nrclienti").text(formatNumber(nrvanzari));
    d3.select("#valoaremedie").text(formatFloat(medie));
  }

  // Like d3.time.format, but faster.
  function parseDate(d) {
    return new Date(2011,
        d.substring(0, 2) - 1,
        d.substring(2, 4),
        d.substring(4, 6),
        d.substring(6, 8));
  }

  window.filterActive = function(tab,filters){
      $('.activeday').toggleClass('activeday');
      $(tab).toggleClass('activeday');
      filters.forEach(function(d, i) { charts[i].filter(d); });
      renderAll();
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  window.reset = function(i) {
    charts[i].filter(null);
    renderAll();
  };

  function flightList(div) {
    var flightsByDate = nestByDate.entries(date.top(10));

    div.each(function() {
      var date = d3.select(this).selectAll(".date")
          .data(flightsByDate, function(d) { return d.key; });

      date.enter().append("table")
          .attr("class", "date table table-striped table-bordered table-condensed")
        .append("th")
          .attr("class", "day")
          .text(function(d) { return formatDate(d.values[0].date); });

      date.exit().remove();

      var flight = date.order().selectAll(".flight")
          .data(function(d) { return d.values; }, function(d) { return d.index; });

      var flightEnter = flight.enter().append("tr")
          .attr("class", "flight");

      flightEnter.append("td")
          .attr("class", "time")
          .text(function(d) { return formatTime(d.date); });

      flightEnter.append("td")
          .attr("class", "origin")
          .text(function(d) { return d.denumire; });

      flightEnter.append("td")
          .attr("class", "destination")
          .text(function(d) { return d.destination; });

      flightEnter.append("td")
          .attr("class", "distance")
          .text(function(d) { return d.cant });

      flightEnter.append("td")
          .attr("class", "delay")
          .classed("early", function(d) { return d.valoare < 0; })
          .text(function(d) { return d.valoare + " lei"; });

      flight.exit().remove();

      flight.order();
    });
  }

  function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 10},
        x,
        y = d3.scale.linear().range([100, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;

    function chart(div) {
      var width = x.range()[1],
          height = y.range()[0];

      y.domain([0, group.top(1)[0].value]);

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);

          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());

          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");

          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);

          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll(".bar").attr("d", barPath);
      });

      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
      dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }
});
