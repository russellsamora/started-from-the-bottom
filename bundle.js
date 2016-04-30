'use strict';

(function () {
	var translate = function translate(x, y) {
		return 'translate(' + x + ',' + y + ')';
	};

	var handleDataLoaded = function handleDataLoaded(err, data) {
		var outerWidth = 640;
		var outerHeight = 480;
		var margin = { top: 20, right: 40, bottom: 40, left: 40 };
		var chartWidth = outerWidth - margin.left - margin.right;
		var chartHeight = outerHeight - margin.top - margin.bottom;

		// create containers
		var svg = d3.select('svg').attr('width', outerWidth).attr('height', outerHeight);

		var chart = svg.append('g').attr('class', 'chart').attr('transform', translate(margin.left, margin.top));

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
		})).range([0, chartWidth]).nice();
		yScale.domain([1, data.filter(function (d) {
			return d.season === '2015-16';
		}).length + 1])
		// .domain(d3.extent(data, d => d.gamesBack))
		.range([0, chartHeight]);

		// create axis
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom').tickFormat(d3.time.format('‘%y'));

		var yAxis = d3.svg.axis().scale(yScale).orient('left').tickValues([1, 5, 10, 15, 20, 25, 30]);

		var line = d3.svg.line().defined(function (d) {
			return d.rank;
		}).interpolate('step').x(function (d) {
			return xScale(d.seasonFormatted);
		}).y(function (d) {
			return yScale(d.rank);
		});

		chart.append('g').attr('class', 'axis axis--x').attr('transform', translate(0, chartHeight)).call(xAxis);

		chart.append('g').attr('class', 'axis axis--y').attr('transform', translate(0, 0)).call(yAxis);

		// add data
		var dots = chart.append('g').attr('class', 'dot-group');

		data = data.filter(function (d) {
			return d.wins;
		});
		dots.selectAll('.dot').data(data).enter().append('circle').attr('class', 'dot').attr('r', 2).attr('cx', function (d) {
			return xScale(d.seasonFormatted);
		}).attr('cy', function (d) {
			return yScale(d.rank);
		});

		var lines = chart.append('g').attr('class', 'line-group');

		var test = data.filter(function (d) {
			return d.team === 'CHO';
		});

		lines.append('path').datum(test).attr('class', 'line').attr('d', line);
	};

	var init = function init() {
		return d3.json('data/output.json', handleDataLoaded);
	};

	init();
})();
