var width = 200,
    height = 200,
    outerRadius = Math.min(width, height) / 2,
    innerRadius = 0,
    data1 = [{"label":"Cafea", "value":0.35},
        {"label":"Panificatie", "value":0.25},
        {"label":"Patiserie", "value":0.15},
        {"label":"Paste", "value":0.1},
        {"label":"Cofetarie", "value":0.8},
        {"label":"Ambalate", "value":0.7}],
    data2 = [{"label":"Cafea", "value":0.15},
        {"label":"Panificatie", "value":0.45},
        {"label":"Patiserie", "value":0.05},
        {"label":"Paste", "value":0.2},
        {"label":"Cofetarie", "value":0.9},
        {"label":"Ambalate", "value":0.6}],
    data = data1,
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

d3.select('#pie-chart').on("click", function() {
    data = data === data1 ? data2 : data1; // swap the data
    arcs = arcs.data(donut(data)); // recompute the angles and rebind the data
//    arcs.transition().duration(750).attrTween("d", arcTween); // redraw the arcs
    arcs.attr("d", arc); // redraw the arcs
});


// Computes the angle of an arc, converting from radians to degrees.
function angle(d) {
    var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
    return a > 90 ? a - 180 : a;
}
// Store the currently-displayed angles in this._current.
// Then, interpolate from this._current to the new angles.
function arcTween(a) {
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
        return arc(i(t));
    };
}