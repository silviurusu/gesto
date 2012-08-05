

d3.csv("/json/", function(sales) {

    // Various formatters.
    var formatNumber = d3.format("d"),
        formatFloat = d3.format("f"),
        formatDate = d3.time.format("%B %d, %Y"),
        formatTime = d3.time.format("%I:%M %p");

    // A little coercion, since the CSV is untyped.
    sales.forEach(function(d, i) {
        d.index = i;
        d.date = parseDate(d.at);
        d.val = (+d.price * +d.qty).toFixed(0);
        d.nrfact = +d.id;
    });

    var sales = crossfilter(sales);

    var all = sales.groupAll(),
        hour = sales.dimension(function(d) {
            return d.date.getHours();
        }),
        hours = hour.group().reduceSum(function(d) { return d.val; }),
        day = sales.dimension(function(d) { return d3.time.day(d.date); }),
        days = day.group().reduceSum(function(d) { return d.val; }),
        dayOfWeek = sales.dimension(function(d) {
            var dow = d.date.getDay();
            switch (dow) {
                case 0:return "Sun";
                case 1:return "Mon";
                case 2:return "Tue";
                case 3:return "Wed";
                case 4:return "Thu";
                case 5:return "Fri";
                case 6:return "Sat";
            }
        }),
        dayOfWeekGroup = dayOfWeek.group().reduceSum(function(d) { return d.val; }),
        value = sales.dimension(function(d) { return d.val<19?Math.floor(d.val):19; }),
        values = value.group(),
        pret = sales.dimension(function(d) { return Math.floor(d.price / 10) * 10; }),
        preturi = pret.group().reduceSum(function(d) { return d.val; }),
        nrfact = sales.dimension(function(d) { return d.nrfact; }),
        nrfacts = nrfact.group(),
        product = sales.dimension(function (d){ return d.product;}),
        products = product.group(),
        category = sales.dimension(function(d) { return d.category}),
        categories = category.group().reduceSum(function(d) { return d.val; }),
        gestiune = sales.dimension(function (d){ return d.gestiune;}),
        gestiuni = gestiune.group(),
        today = new Date();


    window.pieChartDOW = dc.pieChart("#pie-chart-dow")
        .width(250)
        .height(250)
        .radius(100)
        .innerRadius(40)
        .dimension(dayOfWeek)
        .group(dayOfWeekGroup)
        .title(function(d) {
            return d.data.key + ": " + d.data.value;
        })
        .renderTitle(true);

    window.pieChartCategory = dc.pieChart("#pie-chart-category")
        .width(250)
        .height(250)
        .radius(100)
        .dimension(category)
        .group(categories)
        .renderTitle(true);

    window.barChartHour = dc.barChart("#bar-chart-hour")
        .width(270)
        .height(150)
        .dimension(hour)
        .group(hours)
        .elasticY(true)
        .x(d3.scale.linear()
        .domain([6,22])
        .rangeRound([0, 10 * 24]));

    window.barChartValue = dc.barChart("#bar-chart-value")
        .width(270)
        .height(150)
        .dimension(value)
        .group(values)
        .elasticY(true)
        .x(d3.scale.linear()
        .domain([0,20])
        .rangeRound([0, 10 * 20]));

    window.barChartDay = dc.barChart("#bar-chart-day")
        .width(820)
        .height(180)
        .dimension(day)
        .group(days)
        .elasticY(true)
        .round(d3.time.day)
        .x(d3.time.scale()
        .domain([Date.today().moveToFirstDayOfMonth().addDays(-1).moveToFirstDayOfMonth(), Date.today().moveToLastDayOfMonth ().addDays(1)])
        .rangeRound([0, 10 * 80]))
        .xUnits(d3.time.days);

//
//    var chart = d3.selectAll(".chart")
//        .data(charts)
//        .each(function(chart) { chart.on("brush", renderKPI).on("brushend", renderKPI); });


    //renderKPI();
    dc.renderAll();


    // Whenever the brush moves, re-rendering everything.
    function renderKPI() {
        var totalvanzari = all.reduceSum(function(d){return d.valoare}).value(),
            nrvanzari = nrfacts.all().reduce(function(previousValue, currentValue, index, array){
                return currentValue.value>0?previousValue + 1:previousValue ;
            }, 0),
            medie = totalvanzari/nrvanzari;

        x = formatFloat(totalvanzari).length;

        d3.select("#valoarevanzari").text(formatFloat(totalvanzari)).style('font-size', d3.min([24,120/x])+'px');
        d3.select("#nrclienti").text(formatNumber(nrvanzari));
        d3.select("#valoaremedie").text(formatFloat(medie));
    }

    window.filterTime = function(tab){
        $('.activeday').toggleClass('activeday');

        switch(tab.className)
        {
            case 'azi':
                barChartDay.filter([Date.today(), today]);
                break;
            case 'ieri':
                barChartDay.filter([Date.today().addDays(-1), Date.today()]);
                break;
            case 'sapt':
                barChartDay.filter([Date.today().moveToDayOfWeek(1, -1), today]);
                break;
            case 'luna':
                barChartDay.filter([Date.today().moveToFirstDayOfMonth().addDays(-1).moveToFirstDayOfMonth(), Date.today().moveToFirstDayOfMonth().addDays(-1)]);
                break;
            default:
                barChartDay.filter([Date.today().moveToDayOfWeek(1, -1), today]);
        }
        $(tab).toggleClass('activeday');
        dc.renderAll();
    }

    window.filterGest = function(tab){
        $('.activeGest').toggleClass('activeGest');

        if (tab.className.length = 3)
            gestiune.filter(tab.className)

        $(tab).toggleClass('activeGest');
        dc.renderAll();
    }

    function resetAllFilters() {
        hour.filterAll();
        day.filterAll();
        dayOfWeek.filterAll();
        value.filterAll();
        nrfact.filterAll();
        gestiune.filterAll();
        product.filterAll();
    };

    function resetBody(){
        jQuery("body").html('');
    };

    // Like d3.time.format, but faster.
    function parseDate(d) {
        return new Date(d.substring(0, 4),
            d.substring(5, 7) - 1,
            d.substring(8, 10),
            d.substring(11, 13),
            d.substring(14, 16));
    }

    window.reset = function(i) {
        dc.filterAll();
        dc.renderAll();
    };
});


$('#filterProduct').typeahead({
    items:3,
    source:["Strudel visine","Strudel mere","Grilias","Branzoaica","Cappuccino","Schweppes","Sandwich","Amandina"],
    updater:function(item){
        filterProduct(item)
        return item;}
})