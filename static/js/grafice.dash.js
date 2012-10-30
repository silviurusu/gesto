
var margin = {top: 20, right: 80, bottom: 30, left: 50},
    width = 800 - margin.left - margin.right,
    height = 280 - margin.top - margin.bottom;

var parseDate = d3.time.format("%Y%m%d").parse,
    bisectDate = d3.bisector(function(d) { return d.date; }).left,
    formatValue = d3.format(",.2f");

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.sales); });

var svg = d3.select("#vanzari").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("/dashsales/", function(data) {
    keys = d3.keys(data[0]).filter(function(key) { return key !== "date"; });
    color.domain(keys);

    var locationLegendPosition = d3.scale.ordinal()
        .domain(keys)
        .rangePoints([width - 30*keys.length,width],1);

    var locationLabelPosition = d3.scale.ordinal()
        .domain(keys)
        .range([-39, 9]);

    data.forEach(function(d) {
        d.date = parseDate(d.date);
    });

    var locations = color.domain().map(function(name) {
        return {
            name: name,
            values: data.map(function(d) {
                return {date: d.date, sales: +d[name]};
            })
        };
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));

    y.domain([
        d3.min(locations, function(c) { return d3.min(c.values, function(v) { return v.sales; }); }),
        d3.max(locations, function(c) { return d3.max(c.values, function(v) { return v.sales; }); })
    ]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Vanzari (ron)");

    var location = svg.selectAll(".location")
        .data(locations)
        .enter().append("g")
        .attr("class", "location");

    location.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return color(d.name); });

    var legend_labels = location.append("g")
        .attr("class", "legend-label");

    legend_labels.append("text")
        .attr("x", function(d){return locationLegendPosition(d.name)})
        .attr("dy", ".35em")
        .style("stroke", function(d) { return color(d.name); })
        .text(function(d) { return d.name; });

    var focus_labels = location.append("g")
        .attr("class", function(d) { return "focus-label " + d.name;})
        .style("display", "none");

    focus_labels.append("circle")
        .datum(function(d) { return {name: d.name, values: d.values}; })
        .attr("r", 3.5)
        .style("stroke", function(d) { return color(d.name); });

    focus_labels.append("text")
        .attr("x", function(d) {return locationLabelPosition(d.name)})
        .attr("dy", ".35em")
        .style("stroke", function(d) { return color(d.name); });

    var focus_line = svg.append("g")
        .attr("class","focusline")
        .style("display", "none");
    focus_line.append("line")
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", 0).attr("y2", 240);

    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus_labels.style("display", null); focus_line.style("display", null);})
        .on("mouseout", function() { focus_labels.style("display", "none"); focus_line.style("display", "none");})
        .on("mousemove", mousemove);

    function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0,
            i = x0 - d0.date > d1.date - x0 ? i : i-1;
        focus_line.attr("transform", "translate(" + x(d.date) + ")");
        focus_labels.attr("transform", function(d) {
            return "translate(" + x(d.values[i].date) + "," + y(d.values[i].sales) + ")"
        });
        focus_labels.select("text").text(function(d) {return d.values[i].sales;});
    }
});