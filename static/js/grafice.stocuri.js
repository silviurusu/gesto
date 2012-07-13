var margin = {top: 30, right: 10, bottom: 10, left: 100},
    width = 360 - margin.right - margin.left,
    height = 330 - margin.top - margin.bottom;

var format = d3.format(",.0f"),
    formatTime = d3.time.format("%H:%M");

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.ordinal()
    .rangeRoundBands([0, height], .3);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize(-height);

var x2Axis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize(0);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickSize(0);

var svg = d3.select(".zeroStoc-chart").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var svg2 = d3.select(".stocMare-chart").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("/static/js/stoczero.json", function(data) {

    // Parse numbers, and sort by value.
    data.forEach(function(d) {
        d.value = parseDate(d.value) ;
        d.name = d.name.substring(0,15);
    });
    data.sort(function(a, b) { return a.value - b.value; });

    // Set the scale domain.
    x.domain([6, 22]);
    y.domain(data.map(function(d) { return d.name; }));

    var bar = svg.selectAll("g.bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(0," + y(d.name) + ")"; });

    bar.append("rect")
        .attr("width", function(d) { return x(d.value.getHours()); })
        .attr("height", y.rangeBand());

    bar.append("text")
        .attr("class", "value")
        .attr("x", function(d) { return x(d.value.getHours()); })
        .attr("y", y.rangeBand() / 2)
        .attr("dx", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function(d) { return formatTime(d.value); });

    svg.append("g")
        .attr("class", "x bottom axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
});

d3.csv("/static/js/stocmare.json", function(data) {

    // Parse numbers, and sort by value.
    data.forEach(function(d) {
        d.value = +d.value;
        d.name = d.name.substring(0,15);
    });
    data.sort(function(a, b) { return b.value - a.value; });

    // Set the scale domain.
    x.domain([0, d3.max(data, function(d){return d.value})]);
    y.domain(data.map(function(d) { return d.name; }));

    var bar = svg2.selectAll("g.bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(0," + y(d.name) + ")"; });

    bar.append("rect")
        .attr("width", function(d) { return x(d.value); })
        .attr("height", y.rangeBand());

    bar.append("text")
        .attr("class", "value")
        .attr("x", function(d) { return x(d.value); })
        .attr("y", y.rangeBand() / 2)
        .attr("dx", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function(d) { return d.value; });

    svg2.append("g")
        .attr("class", "bottom axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x2Axis);

    svg2.append("g")
        .attr("class", "y axis")
        .call(yAxis);

});
// Like d3.time.format, but faster.
function parseDate(d) {
    return new Date(2011,
        d.substring(0, 2) - 1,
        d.substring(2, 4),
        d.substring(4, 6),
        d.substring(6, 8));
}