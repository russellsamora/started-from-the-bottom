'use strict';

(function () {
	var translate = function translate(x, y) {
		return 'translate(' + x + ',' + y + ')';
	};

	var handleDataLoaded = function handleDataLoaded(err, data) {
		var outerWidth = 960;
		var outerHeight = 540;
		var margin = { top: 20, right: 40, bottom: 40, left: 40 };
		var chartWidth = outerWidth - margin.left - margin.right;
		var chartHeight = outerHeight - margin.top - margin.bottom;

		// create containers
		var svg = d3.select('svg').attr('width', outerWidth).attr('height', outerHeight);

		var chartGroup = svg.append('g').attr('class', 'chart').attr('transform', translate(margin.left, margin.top));

		var yearFormat = d3.time.format('%Y');

		data = data.map(function (d) {
			d.seasonFormatted = yearFormat.parse(d.seasonYear);
			return d;
		});

		// create scales
		var xScale = d3.time.scale();
		var yScale = d3.scale.linear();

		xScale.domain(d3.extent(data, function (d) {
			return d.seasonFormatted;
		})).range([0, chartWidth]);
		// .nice()
		yScale.domain([1, data.filter(function (d) {
			return d.season === '2015-16';
		}).length + 1])
		// .domain(d3.extent(data, d => d.gamesBack))
		.range([0, chartHeight]);

		// create axis
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom').tickFormat(d3.time.format('‘%y'));

		var yAxis = d3.svg.axis().scale(yScale).orient('left').tickValues([1, 5, 10, 15, 20, 25, 30]);

		var createLine = d3.svg.line().defined(function (d) {
			return d.rank;
		}).interpolate('step').x(function (d) {
			return xScale(d.seasonFormatted);
		}).y(function (d) {
			return yScale(d.rank);
		});

		chartGroup.append('g').attr('class', 'axis axis--x').attr('transform', translate(0, chartHeight)).call(xAxis);

		chartGroup.append('g').attr('class', 'axis axis--y').attr('transform', translate(0, 0)).call(yAxis);

		var lineGroup = chartGroup.append('g').attr('class', 'line-group');

		var dotGroup = chartGroup.append('g').attr('class', 'dot-group');

		var dataByTeam = d3.nest().key(function (d) {
			return d.name;
		}).entries(data);

		var test = dataByTeam.filter(function (d) {
			return d.key === 'GSW';
		});

		// DATA
		var teamLine = lineGroup.selectAll('.team').data(test).enter().append('g').attr('class', 'team');

		// ENTER
		teamLine.append('path').attr('class', 'line').attr('d', function (d) {
			return createLine(d.values);
		});

		var teamDot = dotGroup.selectAll('.dot').data(test[0].values).enter().append('circle').attr('class', function (d) {
			return 'dot ' + (d.worst ? 'worst' : '') + ' ' + (d.first ? 'first' : '');
		}).attr('r', 2).attr('cx', function (d) {
			return xScale(d.seasonFormatted);
		}).attr('cy', function (d) {
			return yScale(d.rank);
		});
	};

	var init = function init() {
		return d3.json('data/output.json', handleDataLoaded);
	};

	init();
})();
