dc = {
    version: "0.7.1",
    constants : {
        STACK_CLASS: "stack",
        DESELECTED_CLASS: "deselected",
        SELECTED_CLASS: "selected",
        GROUP_INDEX_NAME: "__group_index__",
        DEFAULT_CHART_GROUP: "__default_chart_group__"
    }
};

dc.chartRegistry = function() {
    // chartGroup:string => charts:array
    var _chartMap = {};

    this.has = function(chart) {
        for(e in _chartMap){
            if(_chartMap[e].indexOf(chart) >= 0)
                return true;
        }
        return false;
    };

    function initializeChartGroup(group) {
        group = group;

        if (!group)
            group = dc.constants.DEFAULT_CHART_GROUP;

        if (!_chartMap[group])
            _chartMap[group] = [];

        return group;
    }

    this.register = function(chart, group) {
        group = initializeChartGroup(group);
        _chartMap[group].push(chart);
    };

    this.clear = function() {
        _chartMap = {};
    };

    this.list = function(group) {
        group = initializeChartGroup(group);
        return _chartMap[group];
    };

    return this;
}();

dc.registerChart = function(chart, group) {
    dc.chartRegistry.register(chart, group);
};

dc.hasChart = function(chart) {
    return dc.chartRegistry.has(chart);
};

dc.deregisterAllCharts = function() {
    dc.chartRegistry.clear();
};

dc.filterAll = function(group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].filterAll();
    }
};

dc.renderAll = function(group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].render();
    }
};

dc.redrawAll = function(group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].redraw();
    }
};

dc.transition = function(selections, duration, callback) {
    if (duration <= 0)
        return selections;

    var s = selections
        .transition()
        .duration(duration);

    if (callback instanceof Function) {
        callback(s);
    }

    return s;
};

dc.units = {};
dc.units.integers = function(s, e) {
    return new Array(Math.abs(e - s));
};

dc.round = {};
dc.round.floor = function(n) {
    return Math.floor(n);
};
dc.round.ceil = function(n) {
    return Math.ceil(n);
};
dc.round.round = function(n) {
    return Math.round(n);
};

dc.override = function(obj, functionName, newFunction) {
    var existingFunction = obj[functionName];
    obj[functionName] = function() {
        var expression = "newFunction(";

        for (var i = 0; i < arguments.length; ++i)
            expression += "argument[" + i + "],";

        expression += "existingFunction);";

        return eval(expression);
    };
};
dc.dateFormat = d3.time.format("%m/%d/%Y");

dc.printers = {};
dc.printers.filter = function(filter) {
    var s = "";

    if (filter) {
        if (filter instanceof Array) {
            if (filter.length >= 2)
                s = "[" + printSingleValue(filter[0]) + " -> " + printSingleValue(filter[1]) + "]";
            else if (filter.length >= 1)
                s = printSingleValue(filter[0]);
        } else {
            s = printSingleValue(filter)
        }
    }

    return s;
};

function printSingleValue(filter) {
    var s = "" + filter;

    if (filter instanceof Date)
        s = dc.dateFormat(filter);
    else if (typeof(filter) == "string")
        s = filter;
    else if (typeof(filter) == "number")
        s = Math.round(filter);

    return s;
}

dc.utils = {};
dc.utils.add = function(l, r) {
    if (l instanceof Date) {
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() + r);
        return d;
    } else {
        return l + r;
    }
};
dc.utils.subtract = function(l, r) {
    if (l instanceof Date) {
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() - r);
        return d;
    } else {
        return l - r;
    }
};
dc.utils.GroupStack = function() {
    var _dataPointMatrix = [];
    var _groups = [];
    var _defaultRetriever;

    function initializeDataPointRow(x) {
        if (!_dataPointMatrix[x])
            _dataPointMatrix[x] = [];
    }

    this.setDataPoint = function(x, y, data) {
        initializeDataPointRow(x);
        _dataPointMatrix[x][y] = data;
    };

    this.getDataPoint = function(x, y) {
        initializeDataPointRow(x);
        var dataPoint = _dataPointMatrix[x][y];
        if (dataPoint == undefined)
            dataPoint = 0;
        return dataPoint;
    };

    this.addGroup = function(group, retriever) {
        if (!retriever)
            retriever = _defaultRetriever;
        _groups.push([group, retriever]);
        return _groups.length - 1;
    };

    this.getGroupByIndex = function(index) {
        return _groups[index][0];
    };

    this.getRetrieverByIndex = function(index) {
        return _groups[index][1];
    };

    this.size = function() {
        return _groups.length;
    };

    this.clear = function() {
        _dataPointMatrix = [];
        _groups = [];
    };

    this.setDefaultRetriever = function(retriever) {
        _defaultRetriever = retriever;
    };
};
dc.cumulative = {};

dc.cumulative.Base = function() {
    this._keyIndex = [];
    this._map = {};

    this.sanitizeKey = function(key) {
        key = key + "";
        return key;
    };

    this.clear = function() {
        this._keyIndex = [];
        this._map = {};
    };

    this.size = function() {
        return this._keyIndex.length;
    };

    this.getValueByKey = function(key) {
        key = this.sanitizeKey(key);
        var value = this._map[key];
        return value;
    };

    this.setValueByKey = function(key, value) {
        key = this.sanitizeKey(key);
        return this._map[key] = value;
    };

    this.indexOfKey = function(key) {
        key = this.sanitizeKey(key);
        return this._keyIndex.indexOf(key);
    };

    this.addToIndex = function(key) {
        key = this.sanitizeKey(key);
        this._keyIndex.push(key);
    };

    this.getKeyByIndex = function(index) {
        return this._keyIndex[index];
    };
};

dc.cumulative.Sum = function() {
    dc.cumulative.Base.apply(this, arguments);

    this.add = function(key, value) {
        if (value == null)
            value = 0;

        if (this.getValueByKey(key) == null) {
            this.addToIndex(key);
            this.setValueByKey(key, value);
        } else {
            this.setValueByKey(key, this.getValueByKey(key) + value);
        }
    };

    this.minus = function(key, value) {
        this.setValueByKey(key, this.getValueByKey(key) - value);
    };

    this.cumulativeSum = function(key) {
        var keyIndex = this.indexOfKey(key);
        if (keyIndex < 0) return 0;
        var cumulativeValue = 0;
        for (var i = 0; i <= keyIndex; ++i) {
            var k = this.getKeyByIndex(i);
            cumulativeValue += this.getValueByKey(k);
        }
        return cumulativeValue;
    };
};
dc.cumulative.Sum.prototype = new dc.cumulative.Base();

dc.cumulative.CountUnique = function() {
    dc.cumulative.Base.apply(this, arguments);

    function hashSize(hash) {
        var size = 0, key;
        for (key in hash) {
            if (hash.hasOwnProperty(key)) size++;
        }
        return size;
    }

    this.add = function(key, e) {
        if (this.getValueByKey(key) == null) {
            this.setValueByKey(key, {});
            this.addToIndex(key);
        }

        if (e != null) {
            if (this.getValueByKey(key)[e] == null)
                this.getValueByKey(key)[e] = 0;

            this.getValueByKey(key)[e] += 1;
        }
    };

    this.minus = function(key, e) {
        this.getValueByKey(key)[e] -= 1;
        if (this.getValueByKey(key)[e] <= 0)
            delete this.getValueByKey(key)[e];
    };

    this.count = function(key) {
        return hashSize(this.getValueByKey(key));
    };

    this.cumulativeCount = function(key) {
        var keyIndex = this.indexOfKey(key);
        if (keyIndex < 0) return 0;
        var cumulativeCount = 0;
        for (var i = 0; i <= keyIndex; ++i) {
            var k = this.getKeyByIndex(i);
            cumulativeCount += this.count(k);
        }
        return cumulativeCount;
    };
};
dc.cumulative.CountUnique.prototype = new dc.cumulative.Base();
dc.baseChart = function(_chart) {
    var _dimension;
    var _group;

    var _anchor;
    var _root;
    var _svg;

    var _width = 200, _height = 200;

    var _keyRetriever = function(d) {
        return d.key;
    };
    var _valueRetriever = function(d) {
        return d.value;
    };

    var _label = function(d) {
        return d.key;
    };
    var _renderLabel = false;

    var _title = function(d) {
        return d.key + ": " + d.value;
    };
    var _renderTitle = false;

    var _transitionDuration = 750;

    var _filterPrinter = dc.printers.filter;

    var _renderlet;

    var _chartGroup = dc.constants.DEFAULT_CHART_GROUP;

    _chart.dimension = function(d) {
        if (!arguments.length) return _dimension;
        _dimension = d;
        return _chart;
    };

    _chart.group = function(g) {
        if (!arguments.length) return _group;
        _group = g;
        return _chart;
    };

    _chart.orderedGroup = function() {
        return _group.order(function(p) {
            return p.key;
        });
    };

    _chart.filterAll = function() {
        return _chart.filter(null);
    };

    _chart.dataAreSet = function() {
        return _dimension != undefined && _group != undefined;
    };

    _chart.select = function(s) {
        return _root.select(s);
    };

    _chart.selectAll = function(s) {
        return _root.selectAll(s);
    };

    _chart.anchor = function(a, chartGroup) {
        if (!arguments.length) return _anchor;
        if (a instanceof Object) {
            _anchor = a.anchor();
            _root = a.root();
        } else {
            _anchor = a;
            _root = d3.select(_anchor);
            dc.registerChart(_chart, chartGroup);
        }
        _chartGroup = chartGroup;
        return _chart;
    };

    _chart.root = function(r) {
        if (!arguments.length) return _root;
        _root = r;
        return _chart;
    };

    _chart.width = function(w) {
        if (!arguments.length) return _width;
        _width = w;
        return _chart;
    };

    _chart.height = function(h) {
        if (!arguments.length) return _height;
        _height = h;
        return _chart;
    };

    _chart.svg = function(_) {
        if (!arguments.length) return _svg;
        _svg = _;
        return _chart;
    };

    _chart.resetSvg = function() {
        _chart.select("svg").remove();
        return _chart.generateSvg();
    };

    _chart.generateSvg = function() {
        _svg = _chart.root().append("svg")
            .attr("width", _chart.width())
            .attr("height", _chart.height());
        return _svg;
    };

    _chart.filterPrinter = function(_) {
        if (!arguments.length) return _filterPrinter;
        _filterPrinter = _;
        return _chart;
    };

    _chart.turnOnControls = function() {
        _chart.selectAll(".reset").style("display", null);
        _chart.selectAll(".filter").text(_filterPrinter(_chart.filter())).style("display", null);
    };

    _chart.turnOffControls = function() {
        _chart.selectAll(".reset").style("display", "none");
        _chart.selectAll(".filter").style("display", "none").text(_chart.filter());
    };

    _chart.transitionDuration = function(d) {
        if (!arguments.length) return _transitionDuration;
        _transitionDuration = d;
        return _chart;
    };

    _chart.render = function() {
        var result = _chart.doRender();

        _chart.invokeRenderlet(_chart);

        return result;
    };

    _chart.redraw = function() {
        var result = _chart.doRedraw();

        _chart.invokeRenderlet(_chart);

        return result;
    };

    // abstract function stub
    _chart.filter = function(f) {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.doRender = function() {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.doRedraw = function() {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.keyRetriever = function(_) {
        if (!arguments.length) return _keyRetriever;
        _keyRetriever = _;
        return _chart;
    };

    _chart.valueRetriever = function(_) {
        if (!arguments.length) return _valueRetriever;
        _valueRetriever = _;
        return _chart;
    };

    _chart.label = function(_) {
        if (!arguments.length) return _label;
        _label = _;
        _renderLabel = true;
        return _chart;
    };

    _chart.renderLabel = function(_) {
        if (!arguments.length) return _renderLabel;
        _renderLabel = _;
        return _chart;
    };

    _chart.title = function(_) {
        if (!arguments.length) return _title;
        _title = _;
        _renderTitle = true;
        return _chart;
    };

    _chart.renderTitle = function(_) {
        if (!arguments.length) return _renderTitle;
        _renderTitle = _;
        return _chart;
    };

    _chart.renderlet = function(_) {
        if (!arguments.length) return _renderlet;
        _renderlet = _;
        return _chart;
    };

    _chart.invokeRenderlet = function(chart) {
        if (chart.renderlet())
            chart.renderlet()(chart);
    };

    _chart.chartGroup = function(_){
        if(!arguments.length) return _chartGroup;
        _chartGroup = _;
        return _chart;
    };

    return _chart;
};
dc.coordinateGridChart = function(_chart) {
    var DEFAULT_Y_AXIS_TICKS = 5;
    var GRID_LINE_CLASS = "grid-line";
    var HORIZONTAL_CLASS = "horizontal";
    var VERTICAL_CLASS = "vertical";

    _chart = dc.baseChart(_chart);

    var _margin = {top: 10, right: 50, bottom: 30, left: 20};

    var _g;

    var _x;
    var _xAxis = d3.svg.axis();
    var _xUnits = dc.units.integers;
    var _xAxisPadding = 0;
    var _xElasticity = false;

    var _y;
    var _yAxis = d3.svg.axis();
    var _yAxisPadding = 0;
    var _yElasticity = false;

    var _filter;
    var _brush = d3.svg.brush();
    var _round;

    var _renderHorizontalGridLine = false;
    var _renderVerticalGridLine = false;

    _chart.generateG = function() {
        _g = _chart.svg().append("g")
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");
        return _g;
    };

    _chart.g = function(_) {
        if (!arguments.length) return _g;
        _g = _;
        return _chart;
    };

    _chart.margins = function(m) {
        if (!arguments.length) return _margin;
        _margin = m;
        return _chart;
    };

    _chart.x = function(_) {
        if (!arguments.length) return _x;
        _x = _;
        return _chart;
    };

    _chart.xAxis = function(_) {
        if (!arguments.length) return _xAxis;
        _xAxis = _;
        return _chart;
    };

    _chart.renderXAxis = function(g) {
        g.select("g.x").remove();

        if (_chart.elasticX()) {
            _x.domain([_chart.xAxisMin(), _chart.xAxisMax()]);
        }

        _x.range([0, _chart.xAxisLength()]);
        _xAxis = _xAxis.scale(_chart.x()).orient("bottom");
        g.append("g")
            .attr("class", "axis x")
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.xAxisY() + ")")
            .call(_xAxis);

        renderVerticalGridLines(g);
    };

    function renderVerticalGridLines(g) {
        if (_renderVerticalGridLine) {
            g.selectAll("g." + VERTICAL_CLASS).remove();

            var ticks = _xAxis.tickValues()?_xAxis.tickValues():_x.ticks(_xAxis.ticks()[0]);

            var gridLineG = g.append("g")
                .attr("class", GRID_LINE_CLASS + " " + VERTICAL_CLASS)
                .attr("transform", "translate(" + _chart.yAxisX() + "," + _chart.margins().top + ")");

            for (var i = 0; i < ticks.length; ++i) {
                var tick = ticks[i];
                gridLineG.append("line")
                    .attr("x1", _x(tick))
                    .attr("y1", _chart.xAxisY() - _chart.margins().top)
                    .attr("x2", _x(tick))
                    .attr("y2", 0);
            }
        }
    }

    _chart.xAxisY = function() {
        return (_chart.height() - _chart.margins().bottom);
    };

    _chart.xAxisLength = function() {
        return _chart.width() - _chart.margins().left - _chart.margins().right;
    };

    _chart.xUnits = function(_) {
        if (!arguments.length) return _xUnits;
        _xUnits = _;
        return _chart;
    };

    _chart.renderYAxis = function(g) {
        g.select("g.y").remove();

        if (_y == null || _chart.elasticY()) {
            _y = d3.scale.linear();
            _y.domain([_chart.yAxisMin(), _chart.yAxisMax()]).rangeRound([_chart.yAxisHeight(), 0]);
        }

        _y.range([_chart.yAxisHeight(), 0]);
        _yAxis = _yAxis.scale(_y).orient("left").ticks(DEFAULT_Y_AXIS_TICKS);

        g.append("g")
            .attr("class", "axis y")
            .attr("transform", "translate(" + _chart.yAxisX() + "," + _chart.margins().top + ")")
            .call(_yAxis);


        renderHorizontalGridLines(g);
    };

    function renderHorizontalGridLines(g) {
        if (_renderHorizontalGridLine) {
            g.selectAll("g." + HORIZONTAL_CLASS).remove();

            var ticks = _yAxis.tickValues()?_yAxis.tickValues():_y.ticks(_yAxis.ticks()[0]);

            var gridLineG = g.append("g")
                .attr("class", GRID_LINE_CLASS + " " + HORIZONTAL_CLASS)
                .attr("transform", "translate(" + _chart.yAxisX() + "," + _chart.margins().top + ")");

            for (var i = 0; i < ticks.length; ++i) {
                if (i == 0) continue;
                var tick = ticks[i];
                gridLineG.append("line")
                    .attr("x1", 1)
                    .attr("y1", _y(tick))
                    .attr("x2", _chart.xAxisLength())
                    .attr("y2", _y(tick));
            }
        }
    }

    _chart.renderHorizontalGridLines = function(_) {
        if (!arguments.length) return _renderHorizontalGridLine;
        _renderHorizontalGridLine = _;
        return _chart;
    };

    _chart.renderVerticalGridLines = function(_){
        if(!arguments.length) return _renderVerticalGridLine;
        _renderVerticalGridLine = _;
        return _chart;
    };

    _chart.yAxisX = function() {
        return _chart.margins().left;
    };

    _chart.y = function(_) {
        if (!arguments.length) return _y;
        _y = _;
        return _chart;
    };

    _chart.yAxis = function(y) {
        if (!arguments.length) return _yAxis;
        _yAxis = y;
        return _chart;
    };

    _chart.elasticY = function(_) {
        if (!arguments.length) return _yElasticity;
        _yElasticity = _;
        return _chart;
    };

    _chart.elasticX = function(_) {
        if (!arguments.length) return _xElasticity;
        _xElasticity = _;
        return _chart;
    };

    _chart.xAxisMin = function() {
        var min = d3.min(_chart.group().all(), function(e) {
            return _chart.keyRetriever()(e);
        });
        return dc.utils.subtract(min, _xAxisPadding);
    };

    _chart.xAxisMax = function() {
        var max = d3.max(_chart.group().all(), function(e) {
            return _chart.keyRetriever()(e);
        });
        return dc.utils.add(max, _xAxisPadding);
    };

    _chart.yAxisMin = function() {
        var min = d3.min(_chart.group().all(), function(e) {
            return _chart.valueRetriever()(e);
        }) - _yAxisPadding;
        return min;
    };

    _chart.yAxisMax = function() {
        var max = d3.max(_chart.group().all(), function(e) {
            return _chart.valueRetriever()(e);
        });
        return dc.utils.add(max, _yAxisPadding);
    };

    _chart.xAxisPadding = function(_) {
        if (!arguments.length) return _xAxisPadding;
        _xAxisPadding = _;
        return _chart;
    };

    _chart.yAxisPadding = function(_) {
        if (!arguments.length) return _yAxisPadding;
        _yAxisPadding = _;
        return _chart;
    };

    _chart.yAxisHeight = function() {
        return _chart.height() - _chart.margins().top - _chart.margins().bottom;
    };

    _chart.round = function(_) {
        if (!arguments.length) return _round;
        _round = _;
        return _chart;
    };

    _chart._filter = function(_) {
        if (!arguments.length) return _filter;
        _filter = _;
        return _chart;
    };

    _chart.filter = function(_) {
        if (!arguments.length) return _filter;

        if (_) {
            _filter = _;
            _chart.brush().extent(_);
            _chart.dimension().filterRange(_);
            _chart.turnOnControls();
        } else {
            _filter = null;
            _chart.brush().clear();
            _chart.dimension().filterAll();
            _chart.turnOffControls();
        }

        return _chart;
    };

    _chart.brush = function(_) {
        if (!arguments.length) return _brush;
        _brush = _;
        return _chart;
    };

    _chart.renderBrush = function(g) {
        _brush.on("brushstart", brushStart)
            .on("brush", brushing)
            .on("brushend", brushEnd);

        var gBrush = g.append("g")
            .attr("class", "brush")
            .attr("transform", "translate(" + _chart.margins().left + ",0)")
            .call(_brush.x(_chart.x()));
        gBrush.selectAll("rect").attr("height", _chart.xAxisY());
        gBrush.selectAll(".resize").append("path").attr("d", _chart.resizeHandlePath);

        if (_filter) {
            _chart.redrawBrush(g);
        }
    };

    function brushStart(p) {
    }

    function brushing(p) {
        var extent = _brush.extent();
        if (_chart.round()) {
            extent[0] = extent.map(_chart.round())[0];
            extent[1] = extent.map(_chart.round())[1];
            _g.select(".brush")
                .call(_brush.extent(extent));
        }
        extent = _brush.extent();
        _chart.filter(_brush.empty() ? null : [extent[0], extent[1]]);
        dc.redrawAll(_chart.chartGroup());
    }

    function brushEnd(p) {
    }

    _chart.redrawBrush = function(g) {
        if (_chart._filter() && _chart.brush().empty())
            _chart.brush().extent(_chart._filter());

        var gBrush = g.select("g.brush");
        gBrush.call(_chart.brush().x(_chart.x()));
        gBrush.selectAll("rect").attr("height", _chart.xAxisY());

        _chart.fadeDeselectedArea();
    };

    _chart.fadeDeselectedArea = function() {
        // do nothing, sub-chart should override this function
    };

    // borrowed from Crossfilter example
    _chart.resizeHandlePath = function(d) {
        var e = +(d == "e"), x = e ? 1 : -1, y = _chart.xAxisY() / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
    };

    _chart.doRender = function() {
        _chart.resetSvg();

        if (_chart.dataAreSet()) {
            _chart.generateG();

            _chart.renderXAxis(_chart.g());
            _chart.renderYAxis(_chart.g());

            _chart.plotData();

            _chart.renderBrush(_chart.g());
        }

        return _chart;
    };

    _chart.doRedraw = function() {
        if (_chart.elasticY())
            _chart.renderYAxis(_chart.g());

        if (_chart.elasticX())
            _chart.renderXAxis(_chart.g());

        _chart.plotData();
        _chart.redrawBrush(_chart.g());

        return _chart;
    };

    _chart.subRender = function() {
        if (_chart.dataAreSet()) {
            _chart.plotData();
        }

        return _chart;
    };

    return _chart;
};
dc.colorChart = function(_chart) {
    var _colors = d3.scale.category20c();

    _chart.colors = function(_) {
        if (!arguments.length) return _colors;

        if(_ instanceof Array)
            _colors = d3.scale.ordinal().range(_);
        else
            _colors = _;

        return _chart;
    };

    return _chart;
};
dc.singleSelectionChart = function(_chart) {
    var _filter;

    _chart.hasFilter = function() {
        return _filter != null;
    };

    _chart.filter = function(f) {
        if (!arguments.length) return _filter;

        _filter = f;

        if (_chart.dataAreSet())
            _chart.dimension().filter(_filter);

        if (f) {
            _chart.turnOnControls();
        } else {
            _chart.turnOffControls();
        }

        return _chart;
    };

    _chart.currentFilter = function() {
       return _filter;
    };

    _chart.highlightSelected = function(e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, true);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    }

    _chart.fadeDeselected = function(e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, true);
    }

    _chart.resetHighlight = function(e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    }

    return _chart;
};
dc.stackableChart = function(_chart) {
    var MIN_DATA_POINT_HEIGHT = 0;
    var DATA_POINT_PADDING_BOTTOM = 1;

    var _groupStack = new dc.utils.GroupStack();

    _chart.stack = function(group, retriever) {
        _groupStack.setDefaultRetriever(_chart.valueRetriever());
        _groupStack.addGroup(group, retriever);
        return _chart;
    };

    _chart.allGroups = function() {
        var allGroups = [];

        allGroups.push(_chart.group());

        for (var i = 0; i < _groupStack.size(); ++i)
            allGroups.push(_groupStack.getGroupByIndex(i));

        return allGroups;
    };

    _chart.allValueRetrievers = function() {
        var allRetrievers = [];

        allRetrievers.push(_chart.valueRetriever());

        for (var i = 0; i < _groupStack.size(); ++i)
            allRetrievers.push(_groupStack.getRetrieverByIndex(i));

        return allRetrievers;
    };

    _chart.getValueRetrieverByIndex = function(groupIndex) {
        return _chart.allValueRetrievers()[groupIndex];
    };

    _chart.yAxisMin = function() {
        var min = 0;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            var m = d3.min(group.all(), function(e) {
                return _chart.getValueRetrieverByIndex(groupIndex)(e);
            });
            if (m < min) min = m;
        }

        return min;
    };

    _chart.yAxisMax = function() {
        var max = 0;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            max += d3.max(group.all(), function(e) {
                return _chart.getValueRetrieverByIndex(groupIndex)(e);
            });
        }

        return dc.utils.add(max, _chart.yAxisPadding());
    };

    _chart.allKeyRetrievers = function() {
        var allRetrievers = [];

        allRetrievers.push(_chart.keyRetriever());

        for (var i = 0; i < _groupStack.size(); ++i)
            allRetrievers.push(_chart.keyRetriever());

        return allRetrievers;
    };

    _chart.getKeyRetrieverByIndex = function(groupIndex) {
        return _chart.allKeyRetrievers()[groupIndex];
    };

    _chart.xAxisMin = function() {
        var min = null;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            var m = d3.min(group.all(), function(e) {
                return _chart.getKeyRetrieverByIndex(groupIndex)(e);
            });
            if (min == null || min > m) min = m;
        }

        return dc.utils.subtract(min, _chart.xAxisPadding());
    };

    _chart.xAxisMax = function() {
        var max = null;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            var m = d3.max(group.all(), function(e) {
                return _chart.getKeyRetrieverByIndex(groupIndex)(e);
            });
            if(max == null || max < m) max = m;
        }

        return dc.utils.add(max, _chart.xAxisPadding());
    };

    _chart.dataPointBaseline = function() {
        return _chart.margins().top + _chart.yAxisHeight() - DATA_POINT_PADDING_BOTTOM;
    };

    _chart.dataPointHeight = function(d, groupIndex) {
        var h = (_chart.yAxisHeight() - _chart.y()(_chart.getValueRetrieverByIndex(groupIndex)(d)) - DATA_POINT_PADDING_BOTTOM);
        if (isNaN(h) || h < MIN_DATA_POINT_HEIGHT)
            h = MIN_DATA_POINT_HEIGHT;
        return h;
    };

    _chart.calculateDataPointMatrix = function(groups) {
        for (var groupIndex = 0; groupIndex < groups.length; ++groupIndex) {
            var data = groups[groupIndex].all();
            for (var dataIndex = 0; dataIndex < data.length; ++dataIndex) {
                var d = data[dataIndex];
                if (groupIndex == 0)
                    _groupStack.setDataPoint(groupIndex, dataIndex, _chart.dataPointBaseline() - _chart.dataPointHeight(d, groupIndex));
                else
                    _groupStack.setDataPoint(groupIndex, dataIndex, _groupStack.getDataPoint(groupIndex - 1, dataIndex) - _chart.dataPointHeight(d, groupIndex))
            }
        }
    };

    _chart.getChartStack = function() {
        return _groupStack;
    };

    return _chart;
};
dc.pieChart = function(parent, chartGroup) {
    var DEFAULT_MIN_ANGLE_FOR_LABEL = 0.5;

    var _sliceCssClass = "pie-slice";

    var _radius = 0, _innerRadius = 0;

    var _g;

    var _arc;
    var _dataPie;
    var _slices;
    var _slicePaths;

    var _labels;
    var _minAngelForLabel = DEFAULT_MIN_ANGLE_FOR_LABEL;

    var _chart = dc.singleSelectionChart(dc.colorChart(dc.baseChart({})));

    _chart.label(function(d) {
        return _chart.keyRetriever()(d.data);
    });
    _chart.renderLabel(true);

    _chart.title(function(d) {
        return d.data.key + ": " + d.data.value;
    });

    _chart.transitionDuration(350);

    _chart.doRender = function() {
        _chart.resetSvg();

        if (_chart.dataAreSet()) {
            _g = _chart.svg()
                .append("g")
                .attr("transform", "translate(" + _chart.cx() + "," + _chart.cy() + ")");

            _dataPie = calculateDataPie();

            _arc = _chart.buildArcs();

            _slices = _chart.drawSlices(_g, _dataPie, _arc);

            _chart.drawLabels(_slices, _arc);
            _chart.drawTitles(_slices, _arc);

            _chart.highlightFilter();
        }

        return _chart;
    };

    _chart.innerRadius = function(r) {
        if (!arguments.length) return _innerRadius;
        _innerRadius = r;
        return _chart;
    };

    _chart.radius = function(r) {
        if (!arguments.length) return _radius;
        _radius = r;
        return _chart;
    };

    _chart.cx = function() {
        return _chart.width() / 2;
    };

    _chart.cy = function() {
        return _chart.height() / 2;
    };

    _chart.buildArcs = function() {
        return d3.svg.arc().outerRadius(_radius).innerRadius(_innerRadius);
    };

    _chart.drawSlices = function(topG, dataPie, arcs) {
        _slices = topG.selectAll("g." + _sliceCssClass)
            .data(dataPie(_chart.orderedGroup().top(Infinity)))
            .enter()
            .append("g")
            .attr("class", function(d, i) {
                return _sliceCssClass + " " + i;
            });

        _slicePaths = _slices.append("path")
            .attr("fill", function(d, i) {
                return _chart.colors()(i);
            })
            .attr("d", arcs);

        _slicePaths
            .transition()
            .duration(_chart.transitionDuration())
            .attrTween("d", tweenPie);

        _slicePaths.on("click", onClick);

        return _slices;
    };

    _chart.drawLabels = function(slices, arc) {
        if (_chart.renderLabel()) {
            _labels = slices.append("text");
            redrawLabels(arc);
            _labels.on("click", onClick);
        }
    };

    _chart.drawTitles = function(slices, arc) {
        if (_chart.renderTitle()) {
            slices.append("title").text(function(d) {
                return _chart.title()(d);
            });
        }
    };

    _chart.highlightFilter = function() {
        if (_chart.hasFilter()) {
            _chart.selectAll("g." + _sliceCssClass).select("path").each(function(d) {
                if (_chart.isSelectedSlice(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll("g." + _sliceCssClass).selectAll("path").each(function(d) {
                _chart.resetHighlight(this);
            });
        }
    };

    _chart.isSelectedSlice = function(d) {
        return _chart.filter() == _chart.keyRetriever()(d.data);
    };

    _chart.doRedraw = function() {
        _chart.highlightFilter();

        var data = _dataPie(_chart.orderedGroup().top(Infinity));

        _slicePaths = _slicePaths.data(data);

        _labels = _labels.data(data);

        dc.transition(_slicePaths, _chart.transitionDuration(), function(s) {
            s.attrTween("d", tweenPie);
        });

        redrawLabels(_arc);

        redrawTitles();

        return _chart;
    };

    _chart.minAngelForLabel = function(_){
        if(!arguments.length) return _minAngelForLabel;
        _minAngelForLabel = _;
        return _chart;
    };

    function calculateDataPie() {
        return d3.layout.pie().value(function(d) {
            return _chart.valueRetriever()(d);
        });
    }

    function redrawLabels(arc) {
        dc.transition(_labels, _chart.transitionDuration())
            .attr("transform", function(d) {
                d.innerRadius = _chart.innerRadius();
                d.outerRadius = _radius;
                var centroid = arc.centroid(d);

                //--my hack--
                //rotate the text for smaller (.9) slice, if too small (.4) no label is displayed; see sliceTooSmall
                if (d.endAngle - d.startAngle < .9)
                    return "translate(" + arc.centroid(d) + ")rotate(" + angle(d) + ")";
                else
                    return "translate(" + arc.centroid(d) + ")";
                //--end my hack--
                if (isNaN(centroid[0]) || isNaN(centroid[1])) {
                    return "translate(0,0)";
                } else {
                    return "translate(" + centroid + ")";
                }
            })
            .attr("text-anchor", "middle")
            .text(function(d) {
                var data = d.data;
                if (sliceHasNoData(data) || sliceTooSmall(d))
                    return "";
                return _chart.label()(d);
            });
    }
    
    // Computes the angle of an arc, converting from radians to degrees.
    function angle(d) {
        var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
        return a > 90 ? a - 180 : a;
    }

    function sliceTooSmall(d) {
        var angle = (d.endAngle - d.startAngle);
        return isNaN(angle) || angle < 0.4;
    }

    function sliceHasNoData(data) {
        return _chart.valueRetriever()(data) == 0;
    }

    function redrawTitles() {
        if (_chart.renderTitle()) {
            _slices.selectAll("title").text(function(d) {
                return _chart.title()(d);
            });
        }
    }

    function tweenPie(b) {
        b.innerRadius = _chart.innerRadius();
        var current = this._current;
        if (isOffCanvas(current))
            current = {startAngle: 0, endAngle: 0};
        //--my hack--
        //test for no data in 'b' when the filter is empty
        if (isOffCanvas(b))
            b = {startAngle: 0, endAngle: 100};
        //--end my hack--
        var i = d3.interpolate(current, b);
        this._current = i(0);
        return function(t) {
            return _arc(i(t));
        };
    }

    function isOffCanvas(current) {
        return current == null || isNaN(current.startAngle) || isNaN(current.endAngle);
    }

    function onClick(d) {
        _chart.filter(_chart.keyRetriever()(d.data));
        dc.redrawAll(_chart.chartGroup());
    }

    return _chart.anchor(parent, chartGroup);
};
dc.barChart = function(parent, chartGroup) {
    var MIN_BAR_WIDTH = 1;
    var BAR_PADDING_WIDTH = 2;

    var _chart = dc.stackableChart(dc.coordinateGridChart({}));

    var _centering = true;

    _chart.transitionDuration(500);

    _chart.plotData = function() {
        var groups = _chart.allGroups();

        _chart.calculateDataPointMatrix(groups);

        for (var groupIndex = 0; groupIndex < groups.length; ++groupIndex) {
            generateBarsPerGroup(groupIndex, groups[groupIndex]);
        }
    };

    function generateBarsPerGroup(groupIndex, group) {
        var bars = _chart.g().selectAll("rect." + dc.constants.STACK_CLASS + groupIndex)
            .data(group.all());

        // new
        bars.enter()
            .append("rect")
            .attr("class", "bar " + dc.constants.STACK_CLASS + groupIndex)
            .attr("x", function(data, dataIndex) {
                return barX(this, data, groupIndex, dataIndex);
            })
            .attr("y", _chart.xAxisY())
            .attr("width", barWidth);
        dc.transition(bars, _chart.transitionDuration())
            .attr("y", function(data, dataIndex) {
                return barY(this, data, dataIndex);
            })
            .attr("height", function(data) {
                return _chart.dataPointHeight(data, getGroupIndexFromBar(this));
            });

        // update
        dc.transition(bars, _chart.transitionDuration())
            .attr("x", function(data, dataIndex) {
                return barX(this, data, groupIndex, dataIndex);
            })
            .attr("y", function(data, dataIndex) {
                return barY(this, data, dataIndex);
            })
            .attr("height", function(data) {
                return _chart.dataPointHeight(data, getGroupIndexFromBar(this));
            });

        // delete
        dc.transition(bars.exit(), _chart.transitionDuration())
            .attr("y", _chart.xAxisY())
            .attr("height", 0);
    }

    function barWidth(d) {
        var numberOfBars = _chart.xUnits()(_chart.x().domain()[0], _chart.x().domain()[1]).length + BAR_PADDING_WIDTH;
        var w = Math.floor(_chart.xAxisLength() / numberOfBars);
        if (isNaN(w) || w < MIN_BAR_WIDTH)
            w = MIN_BAR_WIDTH;
        return w;
    }

    function setGroupIndexToBar(bar, groupIndex) {
        bar[dc.constants.GROUP_INDEX_NAME] = groupIndex;
    }

    function barX(bar, data, groupIndex, dataIndex) {
        setGroupIndexToBar(bar, groupIndex);
        var position = _chart.x()(_chart.keyRetriever()(data)) + _chart.margins().left;
        if(_centering)
            position = position - barWidth(data)/2;
        return position;
    }

    function getGroupIndexFromBar(bar) {
        var groupIndex = bar[dc.constants.GROUP_INDEX_NAME];
        return groupIndex;
    }

    function barY(bar, data, dataIndex) {
        var groupIndex = getGroupIndexFromBar(bar);
        return _chart.getChartStack().getDataPoint(groupIndex, dataIndex);
    }

    _chart.fadeDeselectedArea = function() {
        var bars = _chart.g().selectAll("rect.bar");

        if (!_chart.brush().empty() && _chart.brush().extent() != null) {
            var start = _chart.brush().extent()[0];
            var end = _chart.brush().extent()[1];

            bars.classed(dc.constants.DESELECTED_CLASS, function(d) {
                var xValue = _chart.keyRetriever()(d);
                return xValue < start || xValue >= end;
            });
        } else {
            bars.classed(dc.constants.DESELECTED_CLASS, false);
        }
    };

    _chart.centering = function(_){
        if(!arguments.length) return _centering;
        _centering = _;
        return _chart;
    };

    return _chart.anchor(parent, chartGroup);
};

dc.dataCount = function(_parent) {
    var _formatNumber = d3.format(",f");
    var _chart = dc.baseChart({});

    _chart.render = function() {
        var t = _chart.dimension().groupAll().reduceSum(function(d){return d.val}).value(),
            c = _chart.dimension().dimension(function(d) { return d.nrfact; }).group().all().reduce(function(previousValue, currentValue, index, array){
                    return currentValue.value>0?previousValue + 1:previousValue ;
                }, 0),
            x = _formatNumber(t).length,
            y = _formatNumber(c).length;
        _chart.selectAll(".filter-sales").text(_formatNumber(t)).style('font-size', d3.min([24,120/x])+'px');
        _chart.selectAll(".customer-count").text(_formatNumber(c)).style('font-size', d3.min([24,120/y])+'px');
        _chart.selectAll(".average-count").text(_formatNumber(t/c));

        return _chart;
    };

    _chart.redraw = function(){
        return _chart.render();
    };

    return _chart.anchor(_parent);
};