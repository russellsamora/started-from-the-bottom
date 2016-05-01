'use strict';

(function () {
	var data = [];
	var dataByTeam = [];
	var svg = null;

	var INTERPOLATE = 'step';

	var xScale = d3.time.scale();
	var yScale = d3.scale.linear();

	var createLine = d3.svg.line().defined(function (d) {
		return d.rank;
	}).interpolate(INTERPOLATE).x(function (d) {
		return xScale(d.seasonFormatted);
	}).y(function (d) {
		return yScale(d.rank);
	});

	var translate = function translate(x, y) {
		return 'translate(' + x + ',' + y + ')';
	};

	var addSeason = function addSeason(data) {
		var yearFormat = d3.time.format('%Y');
		return data.map(function (d) {
			d.seasonFormatted = yearFormat.parse(d.seasonYear);
			return d;
		});
	};

	var createDropdown = function createDropdown() {
		var options = dataByTeam.map(function (team) {
			return '<option>' + team.key + '</option>';
		}).join();
		var el = document.querySelector('.teams');
		el.innerHTML = options;
		el.addEventListener('change', function (e) {
			var text = e.target.options[e.target.selectedIndex].text;
			drawTeam(text);
		});
	};

	var drawTeam = function drawTeam(name) {
		var chartGroup = svg.select('.chart');
		var lineGroup = chartGroup.select('.line-group');
		var dotGroup = chartGroup.select('.dot-group');

		var oneTeam = dataByTeam.filter(function (d) {
			return d.key === name;
		});

		// DATA
		var lineSelection = lineGroup.selectAll('.line').data(oneTeam);

		// UPDATE

		// ENTER
		lineSelection.enter().append('path').attr('class', 'line');

		// ENTER + UPDATE
		lineSelection.attr('d', function (d) {
			return createLine(d.values);
		});

		// EXIT
		lineSelection.exit().remove();

		var dataWithWins = oneTeam[0].values.filter(function (d) {
			return d.wins;
		});
		// const dataWithWins = dataWithSeason.filter(d => d.wins)

		var dotSelection = dotGroup.selectAll('.dot').data(dataWithWins);

		dotSelection.enter().append('circle').attr('class', 'dot');

		dotSelection
		// .attr('class', d => `dot ${d.worst ? 'worst' : ''} ${d.first ? 'first' : ''}`)
		.attr('class', function (d) {
			return 'dot ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
		}).attr('r', 4).attr('cx', function (d) {
			return xScale(d.seasonFormatted);
		}).attr('cy', function (d) {
			return yScale(d.rank);
		});

		dotSelection.exit().remove();
	};

	var handleDataLoaded = function handleDataLoaded(err, result) {
		data = addSeason(result);

		dataByTeam = d3.nest().key(function (d) {
			return d.name;
		}).entries(data);

		// setup chart
		var outerWidth = 960;
		var outerHeight = 540;
		var margin = { top: 20, right: 40, bottom: 40, left: 40 };
		var chartWidth = outerWidth - margin.left - margin.right;
		var chartHeight = outerHeight - margin.top - margin.bottom;

		// create containers
		svg = d3.select('svg').attr('width', outerWidth).attr('height', outerHeight);

		var chartGroup = svg.append('g').attr('class', 'chart').attr('transform', translate(margin.left, margin.top));

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

		chartGroup.append('g').attr('class', 'axis axis--x').attr('transform', translate(0, chartHeight)).call(xAxis);

		chartGroup.append('g').attr('class', 'axis axis--y').attr('transform', translate(0, 0)).call(yAxis);

		chartGroup.append('g').attr('class', 'line-group');

		chartGroup.append('g').attr('class', 'dot-group');

		createDropdown();
	};

	var init = function init() {
		return d3.json('data/output.json', handleDataLoaded);
	};

	init();
})();
