var width = 250,
    height = 250,
    outerRadius = Math.min(width, height) / 2,
    innerRadius = outerRadius * .6,
    data = [{"label":"Cafea", "value":0.35},
        {"label":"Panificatie", "value":0.25},
        {"label":"Patiserie", "value":0.15},
        {"label":"Paste", "value":0.1},
        {"label":"Cofetarie", "value":0.8},
        {"label":"Ambalate", "value":0.7}];
    color = d3.scale.category20(),
    donut = d3.layout.pie().value(function(d) { return d.value; }),
    arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);

var vis = d3.select("#pie-chart")
    .append("svg")
    .data([data])
    .attr("width", width)
    .attr("height", height);

var arcs = vis.selectAll("g.arc")
    .data(donut)
    .enter().append("g")
    .attr("class", "arc")
    .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

arcs.append("path")
    .attr("fill", function(d, i) { return color(i); })
    .attr("d", arc);

arcs.append("text")
    .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d, i) { return data[i].label; });