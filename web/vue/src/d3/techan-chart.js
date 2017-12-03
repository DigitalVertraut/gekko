import _ from 'lodash'

// techanjs candle chart with indicators
// based on example http://bl.ocks.org/andredumas/edf630690c10b89be390

export default function(_data, _trades, _indicatorResults, _height, _config) {

    // get chart config from current strategy/method
    var config = (_config[_config.tradingAdvisor.method]).chart || {};
    config.indicatorColors= config.indicatorColors || {};
    config.indicatorStyles = config.indicatorStyles || {};

    let MAX_WIDTH = window.innerWidth;
    
    var dim = {
        width: MAX_WIDTH, height: _height,
        margin: { top: 20, right: 100, bottom: 30, left: 70 },
        ohlc: { height: 505 },
        indicator: { height: 65, padding: 5 }
    };
    dim.plot = {
        width: dim.width - dim.margin.left - dim.margin.right,
        height: dim.height - dim.margin.top - dim.margin.bottom
    };
    dim.indicator.top = dim.ohlc.height+dim.indicator.padding;
    dim.indicator.bottom = dim.indicator.top+dim.indicator.height+dim.indicator.padding;

    var indicatorTop = d3.scaleLinear()
            .range([dim.indicator.top, dim.indicator.bottom]);

    var parseDate = d3.timeParse("%d-%b-%y");

    var zoom = d3.zoom()
            .on("zoom", zoomed);

    var x = techan.scale.financetime()
            .range([0, dim.plot.width]);

    var y = d3.scaleLinear()
            .range([dim.ohlc.height, 0]);


    var yPercent = y.copy();   // Same as y at this stage, will get a different domain later

    var yInit, yPercentInit, zoomableInit;

    var yVolume = d3.scaleLinear()
            .range([y(0), y(0.2)]);

    var candlestick = techan.plot.candlestick()
            .xScale(x)
            .yScale(y);

    var tradearrow = techan.plot.tradearrow()
            .xScale(x)
            .yScale(y)
            .y(function(d) {
                // Display the buy and sell arrows a bit above and below the price, so the price is still visible
                if(d.type === 'buy') return y(d.low)+5;
                if(d.type === 'sell') return y(d.high)-5;
                else return y(d.price);
            });

    // strategy indicators
    let indicators = {};
    let indicatorData = {};
    _.each(_indicatorResults, (results, name) => {
        indicators[name] = techan.plot.sma().xScale(x).yScale(y);
        indicatorData[name] = results.map( val => {
            return {
                date: new Date(val.date),
                value: val.result
            }
        });
    });

    var volume = techan.plot.volume()
            .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
            .xScale(x)
            .yScale(yVolume);

    var xAxis = d3.axisBottom(x);

    var timeAnnotation = techan.plot.axisannotation()
            .axis(xAxis)
            .orient('bottom')
            .format(d3.timeFormat('%Y-%m-%d %H:%M'))
            .width(85)
            .translate([0, dim.plot.height]);

    var yAxis = d3.axisRight(y);

    var ohlcAnnotation = techan.plot.axisannotation()
            .axis(yAxis)
            .orient('right')
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var closeAnnotation = techan.plot.axisannotation()
            .axis(yAxis)
            .orient('right')
            .accessor(candlestick.accessor())
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var percentAxis = d3.axisLeft(yPercent)
            .tickFormat(d3.format('+.1%'));

    var percentAnnotation = techan.plot.axisannotation()
            .axis(percentAxis)
            .orient('left');

    var volumeAxis = d3.axisRight(yVolume)
            .ticks(3)
            .tickFormat(d3.format(",.3s"));

    var volumeAnnotation = techan.plot.axisannotation()
            .axis(volumeAxis)
            .orient("right")
            .width(35);

    var macdScale = d3.scaleLinear()
            .range([indicatorTop(0)+dim.indicator.height, indicatorTop(0)]);

    var rsiScale = macdScale.copy()
            .range([indicatorTop(1)+dim.indicator.height, indicatorTop(1)]);

    var macd = techan.plot.macd()
            .xScale(x)
            .yScale(macdScale);

    var macdAxis = d3.axisRight(macdScale)
            .ticks(3);

    var macdAnnotation = techan.plot.axisannotation()
            .axis(macdAxis)
            .orient("right")
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var macdAxisLeft = d3.axisLeft(macdScale)
            .ticks(3);

    var macdAnnotationLeft = techan.plot.axisannotation()
            .axis(macdAxisLeft)
            .orient("left")
            .format(d3.format(',.2f'));

    var rsi = techan.plot.rsi()
            .xScale(x)
            .yScale(rsiScale);

    var rsiAxis = d3.axisRight(rsiScale)
            .ticks(3);

    var rsiAnnotation = techan.plot.axisannotation()
            .axis(rsiAxis)
            .orient("right")
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var rsiAxisLeft = d3.axisLeft(rsiScale)
            .ticks(3);

    var rsiAnnotationLeft = techan.plot.axisannotation()
            .axis(rsiAxisLeft)
            .orient("left")
            .format(d3.format(',.2f'));

    var ohlcCrosshair = techan.plot.crosshair()
            .xScale(timeAnnotation.axis().scale())
            .yScale(ohlcAnnotation.axis().scale())
            .xAnnotation(timeAnnotation)
            .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
            .verticalWireRange([0, dim.plot.height])
            .on("move", crosshairMove);

    var macdCrosshair = techan.plot.crosshair()
            .xScale(timeAnnotation.axis().scale())
            .yScale(macdAnnotation.axis().scale())
            .xAnnotation(timeAnnotation)
            .yAnnotation([macdAnnotation, macdAnnotationLeft])
            .verticalWireRange([0, dim.plot.height])
            .on("move", crosshairMove);

    var rsiCrosshair = techan.plot.crosshair()
            .xScale(timeAnnotation.axis().scale())
            .yScale(rsiAnnotation.axis().scale())
            .xAnnotation(timeAnnotation)
            .yAnnotation([rsiAnnotation, rsiAnnotationLeft])
            .verticalWireRange([0, dim.plot.height])
            .on("move", crosshairMove);

    var svg = d3.select("#chart").append("svg")
            .attr("width", dim.width)
            .attr("height", dim.height);

    var defs = svg.append("defs");

    defs.append("clipPath")
            .attr("id", "ohlcClip")
        .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim.plot.width)
            .attr("height", dim.ohlc.height);

    defs.selectAll("indicatorClip").data([0, 1])
        .enter()
            .append("clipPath")
            .attr("id", function(d, i) { return "indicatorClip-" + i; })
        .append("rect")
            .attr("x", 0)
            .attr("y", function(d, i) { return indicatorTop(i); })
            .attr("width", dim.plot.width)
            .attr("height", dim.indicator.height);

    svg = svg.append("g")
            .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

    svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dim.plot.height + ")");

    var candleLabel = svg.append('text')
            .style("text-anchor", "start")
            .attr("class", "label")
            .attr("x", 5)
            .attr("y", 8);

    var ohlcSelection = svg.append("g")
            .attr("class", "ohlc")
            .attr("transform", "translate(0,0)");

    ohlcSelection.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + x(1) + ",0)")
        .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -12)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Price");

    ohlcSelection.append("g")
            .attr("class", "close annotation up");

    ohlcSelection.append("g")
            .attr("class", "volume")
            .attr("clip-path", "url(#ohlcClip)");

    ohlcSelection.append("g")
            .attr("class", "candlestick")
            .attr("clip-path", "url(#ohlcClip)");

    var indicatorLabels = {};
    var labelYOffset = 20;
    _.each(indicators, (indicator, name) => {
        var style = config.indicatorStyles[name];
        var color = config.indicatorColors[name] || "blue";
        var inlineStyle = (style || "") + `stroke: ${color};`;

        //log.debug("inlineStyle: " + inlineStyle);

        ohlcSelection.append("g")
            .attr("class", "indicator line-"+name)
            .attr("clip-path", "url(#ohlcClip)")
            .attr("style", inlineStyle);

        indicatorLabels[name] = svg.append('text')
            .style("text-anchor", "start")
            .attr("class", "label")
            .attr("x", 5)
            .attr("y", labelYOffset)
            .style("fill", color)
            .text(name);
        labelYOffset += 12;
    });

    ohlcSelection.append("g")
            .attr("class", "percent axis");

    ohlcSelection.append("g")
            .attr("class", "volume axis");

    var indicatorSelection = svg.selectAll("svg > g.indicator").data(["macd", "rsi"]).enter()
             .append("g")
                .attr("class", function(d) { return d + " indicator"; });

    indicatorSelection.append("g")
            .attr("class", "axis right")
            .attr("transform", "translate(" + x(1) + ",0)");

    indicatorSelection.append("g")
            .attr("class", "axis left")
            .attr("transform", "translate(" + x(0) + ",0)");

    indicatorSelection.append("g")
            .attr("class", "indicator-plot")
            .attr("clip-path", function(d, i) { return "url(#indicatorClip-" + i + ")"; });

    // Add trendlines and other interactions last to be above zoom pane
    svg.append('g')
            .attr("class", "crosshair ohlc")
            .call(ohlcCrosshair);

    svg.append("g")
            .attr("class", "tradearrow")
            .attr("clip-path", "url(#ohlcClip)");

    svg.append('g')
            .attr("class", "crosshair macd");

    svg.append('g')
            .attr("class", "crosshair rsi");


    d3.select("button").on("click", reset);

    var accessor = candlestick.accessor(),
        indicatorPreRoll = 0;  // Don't show where indicators don't have data
    var bisectDate = d3.bisector(accessor.d).left; // accessor.d is equal to function(d) { return d.date; };

    let data = _data.map( d => {
        return {
            date: new Date(d.start),
            open: +d.open,
            high: +d.high,
            low: +d.low,
            close: +d.close,
            volume: +d.volume 
        };
    }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

    x.domain(techan.scale.plot.time(data).domain());
    y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll)).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(data).domain());

    let trades = _trades.map( t => {
        let trade = _.pick(t, ['price']);
        trade.quantity = 1;
        trade.type = t.action;
        trade.date = new Date(t.date);
        trade.high = trade.price ;
        trade.low = trade.price;
        return trade;
    });

    var macdData = techan.indicator.macd()(data);
    macdScale.domain(techan.scale.plot.macd(macdData).domain());
    var rsiData = techan.indicator.rsi()(data);
    rsiScale.domain(techan.scale.plot.rsi(rsiData).domain());

    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.close.annotation").datum([data[data.length-1]]).call(closeAnnotation);
    svg.select("g.volume").datum(data).call(volume);

    _.each(indicators, (indicator, name) => {
        svg.select("g.indicator.line-"+name).datum(indicatorData[name]).call(indicator);
    });

    svg.select("g.macd .indicator-plot").datum(macdData).call(macd);
    svg.select("g.rsi .indicator-plot").datum(rsiData).call(rsi);

    svg.select("g.crosshair.ohlc").call(ohlcCrosshair).call(zoom);
    svg.select("g.crosshair.macd").call(macdCrosshair).call(zoom);
    svg.select("g.crosshair.rsi").call(rsiCrosshair).call(zoom);

    svg.select("g.tradearrow").datum(trades).call(tradearrow);

    // Stash for zooming
    zoomableInit = x.zoomable().clamp(false).copy();
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    crosshairMove({ x: x.domain()[x.domain().length-1], y:1 }) // display last candles in label

    draw();

    function reset() {
        zoom.scale(1);
        zoom.translate([0,0]);
        draw();
    }

    function zoomed() {
        if (window.event.shiftKey !== true)
            x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain());
        
        y.domain(d3.event.transform.rescaleY(yInit).domain());
        yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain());

        draw();
    }

    function draw() {
        svg.select("g.x.axis").call(xAxis);
        svg.select("g.ohlc .axis").call(yAxis);
        svg.select("g.volume.axis").call(volumeAxis);
        svg.select("g.percent.axis").call(percentAxis);
        svg.select("g.macd .axis.right").call(macdAxis);
        svg.select("g.rsi .axis.right").call(rsiAxis);
        svg.select("g.macd .axis.left").call(macdAxisLeft);
        svg.select("g.rsi .axis.left").call(rsiAxisLeft);

        // We know the data does not change, a simple refresh that does not perform data joins will suffice.
        svg.select("g.candlestick").call(candlestick.refresh);
        svg.select("g.close.annotation").call(closeAnnotation.refresh);
        svg.select("g.volume").call(volume.refresh);

        _.each(indicators, (indicator, name) => {
            svg.select("g.indicator.line-"+name).call(indicator.refresh);
        });

        svg.select("g.macd .indicator-plot").call(macd.refresh);
        svg.select("g.rsi .indicator-plot").call(rsi.refresh);
        svg.select("g.crosshair.ohlc").call(ohlcCrosshair.refresh);
        svg.select("g.crosshair.macd").call(macdCrosshair.refresh);
        svg.select("g.crosshair.rsi").call(rsiCrosshair.refresh);
        svg.select("g.tradearrow").call(tradearrow.refresh);
    }

    function crosshairMove(coords) {
        let i = bisectDate(data, coords.x); //get closest index
        let candle = data[i];
        _.each(indicators, (indicator, name) => {
            let value = indicatorData[name][i].value
            indicatorLabels[name].text(name +": "+ ohlcAnnotation.format()(value));
        });
        candleLabel.text(
            timeAnnotation.format()(coords.x || new Date()) 
            + " - O: " + ohlcAnnotation.format()(candle.open)
            + " | H: " + ohlcAnnotation.format()(candle.high)
            + " | L: " + ohlcAnnotation.format()(candle.low)
            + " | C: " + ohlcAnnotation.format()(candle.close)
            + " - Vol: " + volumeAxis.tickFormat()(candle.volume)
        );
    }

}