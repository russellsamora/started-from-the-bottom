'use strict';

(function () {
	var STEPS = ['top-and-bottom', 'path-single', 'path-all', 'path-normalized', 'path-duration'];
	var RADIUS_LARGE = 6;
	var RADIUS_SMALL = 4;
	var SECOND = 1000;
	var EXIT_DURATION = SECOND;
	var MARGIN = { top: 20, right: 40, bottom: 40, left: 40 };
	var outerWidth = 640;
	var outerHeight = 480;

	var previousStep = 0;
	var dir = 0;
	var chartWidth = 0;
	var chartHeight = 0;
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

	function translate(x, y) {
		return 'translate(' + x + ',' + y + ')';
	}

	function cleanData(data) {
		var yearFormat = d3.time.format('%Y');
		return data.map(function (d, index) {
			d.seasonFormatted = yearFormat.parse(d.seasonYear);
			d.id = index;
			return d;
		});
	}

	function createDropdown() {
		var options = dataByTeam.map(function (team) {
			return '<option>' + team.key + '</option>';
		}).join();
		var el = document.querySelector('.teams');
		el.innerHTML = options;
		el.addEventListener('change', function (e) {
			var text = e.target.options[e.target.selectedIndex].text;
			drawTeam(text);
		});
	}

	function getStepData(step) {
		switch (step) {
			case 'top-and-bottom':
				{
					return {
						line: [],
						dot: data.filter(function (d) {
							return d.wins;
						})
					};
				}

			case 'path-single':
				{
					var team = dataByTeam.filter(function (d) {
						return d.key === 'GSW';
					});
					return {
						line: team,
						dot: team[0].values.filter(function (d) {
							return d.wins;
						})
					};
				}

			case 'path-all':
				{}

			case 'path-normalized':
				{}

			case 'path-duration':
				{}

			default:
				return {};
		}
	}

	function tweenDash() {
		var l = this.getTotalLength();
		var i = d3.interpolateString('0,' + l, l + ', ' + l);
		return function (t) {
			return i(t);
		};
	}

	function transitionPath(path) {
		path.transition().duration(SECOND * 4).attrTween('stroke-dasharray', tweenDash);
	}

	function stepGraphic(step) {
		dir = step - previousStep;
		previousStep = step;

		var chartGroup = svg.select('.chart');
		var lineGroup = chartGroup.select('.line-group');
		var dotGroup = chartGroup.select('.dot-group');

		// DATA
		var stepData = getStepData(STEPS[step]);
		var lineSelection = lineGroup.selectAll('.line').data(stepData.line);
		var dotSelection = dotGroup.selectAll('.dot').data(stepData.dot, function (d) {
			return d.id;
		});

		// UPDATE
		switch (STEPS[step]) {
			case 'top-and-bottom':
				{
					dotSelection.enter().append('circle').attr('class', function (d) {
						return 'dot ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					});

					dotSelection.transition().duration(SECOND * 2).delay(function (d) {
						return d.rank * 75;
					}).ease('quad-in-out').attr('r', RADIUS_SMALL);
					break;
				}

			case 'path-single':
				{
					lineSelection.enter().append('path').attr('class', 'line');

					lineSelection.attr('d', function (d) {
						return createLine(d.values);
					}).call(transitionPath);

					dotSelection.enter().append('circle').attr('class', function (d) {
						return 'dot ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cy', function (d) {
						return yScale(d.rank);
					});

					dotSelection.transition().delay(EXIT_DURATION).duration(SECOND * 2).ease('elastic').attr('r', function (d) {
						return d.bottom || d.top ? RADIUS_LARGE : RADIUS_SMALL;
					}).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					});
					break;
				}

			case 'path-all':
				{
					break;
				}

			case 'path-normalized':
				{
					break;
				}

			case 'path-duration':
				{
					break;
				}

			default:
				return {};
		}

		// EXIT
		lineSelection.exit().remove();

		dotSelection.exit().transition().duration(EXIT_DURATION).style('opacity', 0).remove();
	}

	function setupGraphScroll() {
		var gs = graphScroll().container(d3.select('#container')).graph(d3.select('#graphic')).sections(d3.selectAll('section')).on('active', stepGraphic);
	}

	function handleDataLoaded(err, result) {
		data = cleanData(result);

		dataByTeam = d3.nest().key(function (d) {
			return d.name;
		}).entries(data);

		// setup chart
		chartWidth = outerWidth - MARGIN.left - MARGIN.right;
		chartHeight = outerHeight - MARGIN.top - MARGIN.bottom;

		// create containers
		svg = d3.select('svg').attr('width', outerWidth).attr('height', outerHeight);

		var chartGroup = svg.append('g').attr('class', 'chart').attr('transform', translate(MARGIN.left, MARGIN.top));

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

		// createDropdown()
		setupGraphScroll();
	}

	function init() {
		d3.json('data/output.json', handleDataLoaded);
	}

	init();
})();
