

d3.csv("/json/", function(sales) {

    // Various formatters.
    var formatNumber = d3.format("d"),
        formatFloat = d3.format("f"),
        formatDate = d3.time.format("%B %d, %Y"),
        formatTime = d3.time.format("%I:%M %p"),
        sod = 6;//start of day hour

    // A little coercion, since the CSV is untyped.
    sales.forEach(function(d, i) {
        d.index = i;
        d.date = parseDate(d.at);
        d.val = (+d.price * +d.qty).toFixed(2);
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
//        pret = sales.dimension(function(d) { return Math.floor(d.price / 10) * 10; }),
//        preturi = pret.group().reduceSum(function(d) { return d.val; }),
//        qty = sales.dimension(function(d) { return d.qty; }),
//        qties = qty.group().reduceSum(function(d) { return d.qty; }),
//        nrfact = sales.dimension(function(d) { return d.id; }),
//        nrfacts = nrfact.group(),
        product = sales.dimension(function (d){ return d.product;}),
//        products = product.group(),
       category = sales.dimension(function(d) { return d.category}),
       categories = category.group().reduceSum(function(d) { return d.val; }),
        gestiune = sales.dimension(function (d){ return d.gestiune;});
//        gestiuni = gestiune.group(),
//        today = new Date();


   window.pieChartDOW = dc.pieChart("#pie-chart-dow")
       .width(180)
       .height(180)
       .radius(90)
       .innerRadius(30)
       .dimension(dayOfWeek)
       .group(dayOfWeekGroup)
       .title(function(d) {
           return d.data.key + ": " + d.data.value.toFixed();
       })
       .renderTitle(true);

   window.pieChartCategory = dc.pieChart("#pie-chart-category")
       .width(180)
       .height(180)
       .radius(90)
       .dimension(category)
       .group(categories)
       .title(function(d) {
           return d.data.key + ": " + d.data.value.toFixed();
       })
       .renderTitle(true);

    window.barChartHour = dc.barChart("#bar-chart-hour")
        .width(270)
        .height(150)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(hour)
        .group(hours)
        .elasticY(true)
        .x(d3.scale.linear()
        .domain([6,22])
        .rangeRound([0, 10 * 24]));

    window.barChartValue = dc.barChart("#bar-chart-value")
        .width(270)
        .height(150)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(value)
        .group(values)
        .elasticY(true)
        .x(d3.scale.linear()
        .domain([0,20])
        .rangeRound([0, 10 * 20]));

    window.barChartDay = dc.barChart("#bar-chart-day")
        .width(600)
        .height(180)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(day)
        .group(days)
        .elasticY(true)
        .round(d3.time.day.round)
        .x(d3.time.scale()
        .domain([moment().subtract('days',31).startOf('day'), moment().add('days',1).endOf('day')]))
        .xUnits(d3.time.days)
        .filter([moment().day(1), moment().endOf('day')]);

    dc.dataCount("#data-count")
        .dimension(sales)
        .group(all);
    dc.renderAll();

    window.filterTime = function(tab){
        $('.activeday').toggleClass('activeday');

        switch(tab.className)
        {
            case 'today':
                barChartDay.filter([moment().startOf('day'), moment().endOf('day')]);
                break;
            case 'yesterday':
                barChartDay.filter([moment().subtract('days',1).startOf('day'), moment().subtract('days',1).endOf('day')]);
                break;
            case 'currentweek':
                barChartDay.filter([moment().day(1).startOf('day'), moment().endOf('day')]);
                break;
            case 'lastweek':
                barChartDay.filter([moment().day(-6).startOf('day'), moment().day(1).startOf('day')]);
                break;
            default:
                barChartDay.filter([moment().day(1).startOf('day'), moment().endOf('day')]);
        }
        $(tab).toggleClass('activeday');
        $('.nav .reset').show();
        dc.renderAll();
    }

    window.filterGest = function(tab){
        $('.activeGest').toggleClass('activeGest');

        if (tab.className.length == 3 && tab.className != 'all')
            gestiune.filter(tab.className);
        else
            gestiune.filter(null);

        $(tab).toggleClass('activeGest');
        $('.nav .reset').show();
        dc.renderAll();
    }

    window.filterProduct = function(tab){
        if (tab !='' )
            product.filter(tab);
        else
            product.filter(null);

        dc.renderAll();
    }

    // Like d3.time.format, but faster.
    function parseDate(d) {
        return new Date(d.substring(0, 4),
            d.substring(5, 7) - 1,
            d.substring(8, 10),
            d.substring(11, 13),
            d.substring(14, 16));
    }

   window.reset = function() {
        $('.activeGest').toggleClass('activeGest');
        $('.all').toggleClass('activeGest');
        $('.activeday').toggleClass('activeday');
        $('.nav .reset').hide();
        $('form .btn.reset').hide();
        gestiune.filter(null);
        dc.filterAll();
        dc.redrawAll();
    };
   window.productReset = function() {
       $('#filterProduct').val("");
       $('form .btn.reset').hide();
        product.filterAll();
        dc.redrawAll();
    };

});



$('#filterProduct').typeahead({
    items:8,
    source:   function (query, process) {
                return $.get('/products/', {query: query }, function (data) {
                    labels = []
                    $.each(data, function(i,item) {
                        labels.push(item.name);
                    });
                    return process(labels);
                })
    },
    updater:function(item){
                filterProduct(item);
                $('form .btn.reset').show();
                return item;
    },
    minLength:3
})