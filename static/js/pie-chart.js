var width = 200,
    height = 200,
    outerRadius = Math.min(width, height) / 2,
    innerRadius = 0,
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
    .attr("transform", function(d) {

        if (d.endAngle - d.startAngle < .7)
            return "translate(" + arc.centroid(d) + ")rotate(" + angle(d) + ")";
        else
            return "translate(" + arc.centroid(d) + ")";
    })
    .attr("dy", ".14em")
    .attr("text-anchor", "middle")
    .style("fill", "White")
    .text(function(d, i) { return data[i].label; });

// Computes the angle of an arc, converting from radians to degrees.
function angle(d) {
    var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
    return a > 90 ? a - 180 : a;
}