'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

(function () {
	var TEAM_NAME_DICT = { 'ATL': 'Hawks', 'BOS': 'Celtics', 'BRK': 'Nets', 'CHI': 'Bulls', 'CHO': 'Hornets', 'CLE': 'Cavaliers', 'DAL': 'Mavericks', 'DEN': 'Nuggets', 'DET': 'Pistons', 'GSW': 'Warriors', 'HOU': 'Rockets', 'IND': 'Pacers', 'LAC': 'Clippers', 'LAL': 'Lakers', 'MEM': 'Grizzlies', 'MIA': 'Heat', 'MIL': 'Bucks', 'MIN': 'Timberwolves', 'NOP': 'Pelicans', 'NYK': 'Knicks', 'OKC': 'Thunder', 'ORL': 'Magic', 'PHI': '76ers', 'PHO': 'Suns', 'POR': 'Trail Blazers', 'SAC': 'Kings', 'SAS': 'Spurs', 'TOR': 'Raports', 'UTA': 'Jazz', WAS: 'Wizards' };
	var COUNT_TO_WORD = ['zero', 'one', 'two', 'three', 'four', 'five'];
	var STEPS = ['top-and-bottom', 'warriors', 'stretch-single', 'stretch-all', 'stretch-duration', 'stretch-incomplete'];
	var SECOND = 1000;
	var EXIT_DURATION = SECOND;
	var MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
	var GRAPHIC_MARGIN = 20;
	var RATIO = 16 / 9;
	var SECTION_WIDTH = 360;
	var DRAKE = 2.8;
	var RADIUS_FACTOR = 1.5;
	var DRAGGABLE = false;
	var TOOLTIP_HEIGHT = 18;

	var audioElement = document.querySelector('.sample');

	var singleTeam = 'GSW';
	var outerWidth = 0;
	var outerHeight = 0;
	var radiusSmall = 0;
	var radiusLarge = 0;
	var previousStep = 0;
	var dir = 0;
	var chartWidth = 0;
	var chartHeight = 0;
	var data = [];
	var dataByTeam = [];
	var svg = null;
	var stretchesCompleted = 0;
	var stretchesIncomplete = 0;
	var stretchesMedian = 0;
	var draked = false;

	var INTERPOLATE = 'step';
	var xScale = d3.time.scale();
	var yScale = d3.scale.linear();
	var xScaleNormalized = d3.scale.linear();
	var yScaleLinear = d3.scale.linear();
	var yearFormat = d3.time.format('%Y');

	var createLine = d3.svg.line().defined(function (d) {
		return d.rank;
	}).interpolate(INTERPOLATE).x(function (d) {
		return xScale(d.seasonFormatted);
	}).y(function (d) {
		return yScale(d.rank);
	});

	var createNormalizedLine = d3.svg.line().defined(function (d) {
		return d.rank;
	}).interpolate(INTERPOLATE).x(function (d, i) {
		return xScaleNormalized(i);
	}).y(function (d) {
		return yScale(d.rank);
	});

	var createLineDuration = d3.svg.line().defined(function (d) {
		return d.rank;
	}).interpolate('linear').x(function (d) {
		return xScale(d.seasonFormatted);
	}).y(function (d) {
		return 0;
	});

	function translate(x, y) {
		return 'translate(' + x + ',' + y + ')';
	}

	function cleanData(data) {
		return data.map(function (d, id) {
			return _extends({}, d, {
				seasonFormatted: yearFormat.parse(d.seasonYear),
				id: id
			});
		});
	}

	function calculateIncompleteStretch(indices) {
		if (indices.length % 2 === 1) return indices[indices.length - 1];
		return null;
	}

	function calculateStretch(team) {
		var indices = team.values.map(function (v, i) {
			return v.start || v.stop ? i : -1;
		}).filter(function (v) {
			return v > -1;
		});

		var len = indices.length;
		var newLen = Math.floor(len / 2) * 2;
		var sliced = indices.slice(0, newLen);
		var completed = sliced.map(function (v, i) {
			var streak = i % 2 ? v - sliced[i - 1] : -1;
			return streak;
		}).filter(function (v) {
			return v > 0;
		}).reduce(function (previous, current) {
			return previous.concat(current);
		}, []);

		return { indices: indices, completed: completed };
	}

	function addStretches(values) {
		var active = 0;
		return values.map(function (season) {
			var bottom = season.bottom;
			var top = season.top;

			if (bottom && !active) {
				season.start = true;
				season.stretch = true;
				active += 1;
			} else if (top && active) {
				season.stop = true;
				season.stretch = true;
				season.stopCount = active;
				active = 0;
			}
			if (active) {
				season.stretch = true;
				active += 1;
			}
			return season;
		});
	}

	function getStretches(team) {
		var indices = team.stretches.indices;

		var len = indices.length;
		var newLen = Math.floor(len / 2) * 2;
		var sliced = indices.slice(0, newLen);

		var stretches = sliced.map(function (index, i) {
			var a = index + 1;
			var b = sliced[i - 1];
			return i % 2 ? team.values.slice(b, a) : null;
		}).filter(function (d) {
			return d;
		});

		return stretches;
	}

	function getAverageDiff(count) {
		var diff = count - stretchesMedian;
		if (diff < 2) {
			return 'was <strong class="top">quicker</strong> than';
		} else if (diff > 2) {
			return 'took <strong class="bottom">longer</strong> than';
		} else {
			return 'was about';
		}
	}

	function getStepData(step) {
		switch (step) {
			case 'top-and-bottom':
				{
					return {
						all: [],
						wins: data.filter(function (d) {
							return d.wins;
						}),
						stretches: []
					};
				}

			case 'warriors':
				{
					var team = dataByTeam.filter(function (d) {
						return d.key === 'GSW';
					});
					return {
						all: team,
						wins: team[0].values.filter(function (d) {
							return d.wins;
						}),
						stretches: []
					};
				}

			case 'stretch-single':
				{
					var _team = dataByTeam.filter(function (d) {
						return d.key === singleTeam;
					});
					return {
						all: _team,
						wins: _team[0].values.filter(function (d) {
							return d.wins;
						}),
						stretches: getStretches(_team[0])
					};
				}

			case 'stretch-all':
				{
					// TODO can we get first bottom part of completed stretch?
					var stretches = dataByTeam.map(getStretches).filter(function (s) {
						return s.length;
					}).reduce(function (previous, current) {
						return previous.concat(current);
					});

					var wins = stretches.reduce(function (previous, current) {
						var startAndStop = [current[0], current[current.length - 1]];
						return previous.concat(startAndStop);
					}, []);

					return {
						all: [],
						wins: wins,
						stretches: stretches
					};
				}

			case 'stretch-normalized':
				{
					var _stretches = dataByTeam.map(getStretches).filter(function (s) {
						return s.length;
					}).reduce(function (previous, current) {
						return previous.concat(current);
					});

					var _wins = _stretches.reduce(function (previous, current) {
						var startAndStop = [current[0], current[current.length - 1]];
						return previous.concat(startAndStop);
					}, []);

					return {
						all: [],
						wins: _wins,
						stretches: _stretches
					};
				}

			case 'stretch-duration':
				{
					var _stretches2 = dataByTeam.map(getStretches).filter(function (s) {
						return s.length;
					}).reduce(function (previous, current) {
						return previous.concat(current);
					}).map(function (s) {
						return [s[0], s[s.length - 1]];
					}).sort(function (a, b) {
						return +a[0].seasonYear - +b[0].seasonYear;
					});

					var _wins2 = _stretches2.reduce(function (previous, current) {
						return previous.concat(current);
					}, []);

					return {
						all: [],
						wins: _wins2,
						stretches: _stretches2
					};
				}

			case 'stretch-incomplete':
				{
					var _stretches3 = dataByTeam.filter(function (d) {
						return d.incomplete !== null;
					}).map(function (d) {
						return [d.values[d.incomplete], d.values[d.values.length - 1]];
					}).sort(function (a, b) {
						return +a[0].seasonYear - +b[0].seasonYear;
					});

					var _wins3 = _stretches3.map(function (s) {
						return s[0];
					});

					return {
						all: [],
						wins: _wins3,
						stretches: _stretches3
					};
				}

			default:
				return {};
		}
	}

	function emptyDash() {
		return '0,' + this.getTotalLength();
	}

	function tweenDash() {
		var l = this.getTotalLength();
		var i = d3.interpolateString('0,' + l, l + ', ' + l);
		return function (t) {
			return i(t);
		};
	}

	function updateMadlib(stretches) {
		var count = stretches.length;
		document.querySelector('.madlib-count').innerHTML = count ? 'have completed the journey from the bottom to the top <strong class=\'top\'>' + COUNT_TO_WORD[count] + '</strong> time' + (count === 1 ? '' : 's') + ' in franchise history.' : 'have never completed a journey to the top after starting from the bottom.';

		var recent = count ? stretches[count - 1].length - 1 : 0;
		document.querySelector('.madlib-detail').innerHTML = count ? 'Their most recent ascent ' + getAverageDiff(recent) + ' league average, spanning ' + recent + ' seasons.' : 'Maybe next year fellas...';
	}

	function hideAnnotations() {
		d3.selectAll('.annotation').transition().duration(SECOND).ease('elastic').style('opacity', 0);
	}

	// show tooltip
	function enterCircle(d) {
		var tooltipText = d3.select('.tooltip-text');
		var tooltipRect = d3.select('.tooltip-rect');
		var cx = d3.select(this).attr('cx');
		var cy = d3.select(this).attr('cy');
		var r = d3.select(this).attr('r');
		var name = TEAM_NAME_DICT[d.name];
		var year = d.season.substring(2, d.season.length);

		var yr = +d.seasonYear;
		var anchor = yr < 1986 ? 'left' : yr > 2006 ? 'end' : 'middle';

		tooltipText.text(year + ' ' + name + ': ').attr('x', cx).attr('y', cy).attr('dy', -r * 2).attr('text-anchor', anchor).append('tspan').text(d.wins + ' wins');

		var _tooltipText$0$0$getB = tooltipText[0][0].getBBox();

		var x = _tooltipText$0$0$getB.x;
		var y = _tooltipText$0$0$getB.y;
		var width = _tooltipText$0$0$getB.width;
		var height = _tooltipText$0$0$getB.height;


		tooltipRect.attr('x', x - 4).attr('y', y).attr('width', width + 8).attr('height', height).attr('class', 'tooltip-rect');
	}

	// hide tooltip
	function exitCircle() {
		d3.select('.tooltip-text').text('');
		d3.select('.tooltip-rect').attr('class', 'tooltip-rect hide');
	}

	function bindTip(selection) {
		selection.on('mouseenter', enterCircle).on('mouseout', exitCircle);
	}

	function stepGraphic(step) {
		dir = step - previousStep;
		previousStep = step;

		var chartGroup = svg.select('.chart');
		var allGroup = chartGroup.select('.all-group');
		var winsGroup = chartGroup.select('.wins-group');
		var stretchGroup = chartGroup.select('.stretch-group');

		// DATA
		var stepData = getStepData(STEPS[step]);
		var allSelection = allGroup.selectAll('.all').data(stepData.all, function (d, i) {
			return d.key ? d.key + '-' + i : i;
		});
		var winsSelection = winsGroup.selectAll('.wins').data(stepData.wins, function (d) {
			return d.id;
		});
		var stretchSelection = stretchGroup.selectAll('.stretch').data(stepData.stretches, function (d, i) {
			return d.length ? '' + d[0].id : i;
		});

		// hide all annotations
		hideAnnotations();

		// UPDATE
		switch (STEPS[step]) {
			case 'top-and-bottom':
				{
					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					}).call(bindTip);

					winsSelection.transition().duration(SECOND).delay(function (d) {
						return d.rank * 50 + (dir === 0 ? 0 : EXIT_DURATION);
					}).ease('quad-in-out').attr('r', radiusSmall).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					});
					break;
				}

			case 'warriors':
				{
					allSelection.enter().append('path').attr('class', 'all').style('opacity', 0);

					allSelection.attr('d', function (d) {
						return createLine(d.values);
					}).transition('quad-in-out').delay(EXIT_DURATION).duration(SECOND).style('opacity', 1);

					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					}).call(bindTip);

					winsSelection.transition().delay(function (d, i) {
						return EXIT_DURATION * 1.5 + i * 50;
					}).duration(SECOND * DRAKE).ease('elastic').attr('r', function (d) {
						return d.bottom || d.top ? radiusLarge : radiusSmall;
					}).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					});

					d3.select('.annotation-73').transition().delay(EXIT_DURATION).duration(SECOND).ease('elastic').style('opacity', 1);

					break;
				}

			case 'stretch-single':
				{
					allSelection.enter().append('path').attr('class', 'all');

					allSelection.attr('d', function (d) {
						return createLine(d.values);
					});

					stretchSelection.enter().append('g').attr('class', 'stretch').append('path').attr('class', 'stretch-path').attr('stroke-width', radiusSmall + 'px');

					stretchSelection.select('path').attr('d', createLine).attr('stroke-dasharray', emptyDash);

					stretchSelection.select('path').attr('d', createLine).transition().duration(SECOND * DRAKE).ease('quad-in-out').attr('stroke-width', radiusSmall + 'px').attrTween('stroke-dasharray', tweenDash);

					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					}).call(bindTip);

					winsSelection.transition().duration(SECOND).ease('elastic').attr('r', function (d) {
						return d.bottom || d.top ? radiusLarge : radiusSmall;
					});

					// drake!
					if (stepData.stretches.length && !draked) {
						draked = true;
						audioElement.play();
					}

					updateMadlib(stepData.stretches);
					break;
				}

			case 'stretch-all':
				{
					stretchSelection.enter().append('g').attr('class', 'stretch').attr('transform', translate(0, 0)).style('opacity', 0).append('path').attr('class', 'stretch-path').attr('stroke-width', '2px');

					stretchSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('transform', translate(0, 0)).style('opacity', 1).select('path').transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('stroke-width', '2px').attr('d', createLine);

					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					}).call(bindTip);

					winsSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('r', radiusSmall).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d) {
						return yScale(d.rank);
					});

					d3.selectAll('.axis--y').transition().delay(EXIT_DURATION).duration(SECOND).style('opacity', 1);

					break;
				}

			case 'stretch-duration':
				{
					stretchSelection.enter().append('g').attr('class', 'stretch').attr('transform', function (d, i) {
						return translate(0, yScaleLinear(i));
					}).style('opacity', 0).append('path').attr('class', 'stretch-path').attr('stroke-width', '2px');

					stretchSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('transform', function (d, i) {
						return translate(0, yScaleLinear(i));
					}).style('opacity', 1).select('path').transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('stroke-width', '2px').attr('d', createLineDuration);

					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d, i) {
						return yScaleLinear(Math.floor(i / 2));
					}).call(bindTip);

					winsSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('r', radiusSmall).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d, i) {
						return yScaleLinear(Math.floor(i / 2));
					});

					d3.selectAll('.axis--y').transition().delay(EXIT_DURATION).duration(SECOND).style('opacity', 0);

					d3.select('.annotation-paul').transition().delay(EXIT_DURATION).duration(SECOND).ease('elastic').style('opacity', 1);

					d3.select('.annotation-spurs').transition().delay(EXIT_DURATION).duration(SECOND).ease('elastic').style('opacity', 1);

					break;
				}

			case 'stretch-incomplete':
				{
					stretchSelection.enter().append('g').attr('class', 'stretch').attr('transform', function (d, i) {
						return translate(0, yScaleLinear(i));
					}).style('opacity', 0).append('path').attr('class', 'stretch-path').attr('stroke-width', '2px');

					stretchSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('transform', function (d, i) {
						return translate(0, yScaleLinear(i));
					}).style('opacity', 1).select('path').transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('stroke-width', '2px').attr('d', createLineDuration);

					winsSelection.enter().append('circle').attr('class', function (d) {
						return 'wins ' + (d.bottom ? 'bottom' : '') + ' ' + (d.top ? 'top' : '');
					}).attr('r', 0).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d, i) {
						return yScaleLinear(i);
					}).call(bindTip);

					winsSelection.transition().delay(EXIT_DURATION).duration(SECOND).ease('quad-in-out').attr('r', radiusSmall).attr('cx', function (d) {
						return xScale(d.seasonFormatted);
					}).attr('cy', function (d, i) {
						return yScaleLinear(i);
					});

					d3.selectAll('.axis--y').transition().delay(EXIT_DURATION).duration(SECOND).style('opacity', 0);
					break;
				}

			default:
				return {};
		}

		// EXIT
		allSelection.exit().transition().duration(dir === 0 ? 0 : EXIT_DURATION).style('opacity', 0).remove();

		winsSelection.exit().transition().duration(dir === 0 ? 0 : EXIT_DURATION).attr('r', 0).remove();

		stretchSelection.exit().transition().duration(dir === 0 ? 0 : EXIT_DURATION).style('opacity', 0).remove();
	}

	function updateSingleStep() {
		singleTeam = this.value;
		if (previousStep === 2) stepGraphic(2);
	}

	function setupGraphScroll() {
		var gs = graphScroll().container(d3.select('#container')).graph(d3.select('#graphic')).sections(d3.selectAll('section')).on('active', stepGraphic);
	}

	function handleDataLoaded(err, result) {
		data = cleanData(result);

		var byTeam = d3.nest().key(function (d) {
			return d.name;
		}).entries(data);

		dataByTeam = byTeam.map(function (d) {
			return _extends({}, d, {
				values: addStretches(d.values)
			});
		}).map(function (d) {
			return _extends({}, d, {
				stretches: calculateStretch(d)
			});
		}).map(function (d) {
			return _extends({}, d, {
				incomplete: calculateIncompleteStretch(d.stretches.indices)
			});
		});

		var completed = dataByTeam.reduce(function (previous, current) {
			return previous.concat(current.stretches.completed);
		}, []);
		var incomplete = dataByTeam.reduce(function (previous, current) {
			return current.incomplete !== null ? previous += 1 : previous;
		}, 0);
		stretchesMedian = d3.median(completed);
		stretchesCompleted = completed.length;
		stretchesIncomplete = incomplete;

		// setup chart
		chartWidth = outerWidth - MARGIN.left - MARGIN.right;
		chartHeight = outerHeight - MARGIN.top - MARGIN.bottom;

		// create containers
		svg = d3.select('svg').attr('width', outerWidth).attr('height', outerHeight);

		var chartGroup = svg.append('g').attr('class', 'chart').attr('transform', translate(MARGIN.left, MARGIN.top));

		xScale.domain(d3.extent(data, function (d) {
			return d.seasonFormatted;
		})).range([0, chartWidth]);

		yScale.domain([1, data.filter(function (d) {
			return d.season === '2015-16';
		}).length + 1]).range([0, chartHeight]);

		// shortest to longest stretch
		xScaleNormalized.domain([0, d3.max(completed)]).range([0, chartWidth]);

		// ordered
		yScaleLinear.domain([0, stretchesCompleted]).range([0, chartHeight]);

		// create axis
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom').tickFormat(d3.time.format('%Y'));

		var yAxis = d3.svg.axis().scale(yScale).orient('left').tickValues([1, 5, 10, 15, 20, 25, 30]);

		chartGroup.append('g').attr('class', 'axis axis--x').attr('transform', translate(0, chartHeight)).call(xAxis);

		chartGroup.append('g').attr('class', 'axis axis--y').attr('transform', translate(0, 0)).call(yAxis);

		chartGroup.append('g').attr('class', 'axis axis--y axis--y-label').attr('transform', 'rotate(-90)').append('text').text('Rank (regular season)').attr('x', -chartHeight / 2).attr('y', 0).attr('dy', '-2em').style('text-anchor', 'middle');

		chartGroup.append('g').attr('class', 'all-group');

		chartGroup.append('g').attr('class', 'stretch-group');

		chartGroup.append('g').attr('class', 'wins-group');

		chartGroup.append('rect').attr('class', 'tooltip-rect').attr('rx', 2).attr('ry', 2);

		chartGroup.append('text').attr('class', 'tooltip-text');

		setupGraphScroll();
		createDropdown();
		setupSwoopyDrag();
	}

	function createDropdown() {
		var el = document.querySelector('.madlib-name');
		var html = Object.keys(TEAM_NAME_DICT).map(function (key) {
			var selected = key === 'GSW' ? ' selected' : '';
			return '<option' + selected + ' value=\'' + key + '\'>' + TEAM_NAME_DICT[key] + '</option>';
		}).join('\n');
		el.innerHTML = html;

		el.addEventListener('change', updateSingleStep);

		// set first madlib
		var team = dataByTeam.filter(function (d) {
			return d.key === 'GSW';
		});
		updateMadlib(getStretches(team[0]));
		// total madlib
		document.querySelector('.madlib-total').textContent = stretchesCompleted;
		document.querySelector('.madlib-median').textContent = stretchesMedian;
	}

	function setupSwoopyDrag() {
		d3.select('.chart').append('marker').attr('id', 'arrow').attr('viewBox', '-10 -10 20 20').attr('markerWidth', 20).attr('markerHeight', 20).attr('orient', 'auto').append('path').attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75');

		window.annotationsRank = [{
			"x": "1977",
			"y": 2,
			"path": "M152,10C96,-17,50,-16,16,-5",
			"text": "Paul Pierce is born",
			"className": "annotation annotation-paul",
			"textOffset": [155, 17]
		}, {
			"x": "2016",
			"y": 1,
			"path": "M-113,55C-62,55,-21,45,0,9",
			"text": "73 wins!",
			"className": "annotation annotation-73",
			"textOffset": [-160, 58]
		}];

		window.annotationsOrder = [{
			"x": "1997",
			"y": 27,
			"path": "M-31,35C-13,36,9,28,9,0",
			"text": "The Spurs get right back up",
			"className": "annotation annotation-spurs",
			"textOffset": [-173, 38]
		}];
		var swoopyRank = d3.swoopyDrag().x(function (d) {
			return xScale(yearFormat.parse(d.x));
		}).y(function (d) {
			return yScale(d.y);
		}).draggable(DRAGGABLE).annotations(annotationsRank).className(function (d) {
			return d.className;
		});

		var swoopyRankSel = d3.select('.chart').append('g').attr('class', 'annotations').call(swoopyRank);

		swoopyRankSel.selectAll('path').attr('marker-end', 'url(#arrow)');

		var swoopyOrder = d3.swoopyDrag().x(function (d) {
			return xScale(yearFormat.parse(d.x));
		}).y(function (d) {
			return yScaleLinear(d.y);
		}).draggable(DRAGGABLE).annotations(annotationsOrder).className(function (d) {
			return d.className;
		});

		var swoopyOrderSel = d3.select('.chart').append('g').attr('class', 'annotations').call(swoopyOrder);

		swoopyOrderSel.selectAll('path').attr('marker-end', 'url(#arrow)');
	}

	function setupYoutube() {
		var tag = document.createElement('script');

		tag.src = 'https://www.youtube.com/iframe_api';
		var firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

		var player = null;
		var ready = false;

		var setupStephEvents = function setupStephEvents() {
			var steph = document.querySelector('.stephen-curry');
			var youtube = document.querySelector('.youtube');
			steph.addEventListener('mouseenter', function (event) {
				youtube.classList.remove('transparent');
				player.playVideo();
			});
			steph.addEventListener('mouseout', function (event) {
				youtube.classList.add('transparent');
				player.pauseVideo();
			});
		};

		var onPlayerReady = function onPlayerReady(event) {
			// console.log('player ready', event)
			player.mute();
			player.playVideo();
		};

		var onPlayerStateChange = function onPlayerStateChange(event) {
			// console.log('player statechange' , event)
			if (!ready && event.data === 1) {
				ready = true;
				player.pauseVideo();
				player.unMute();
				player.setVolume(50);
				setupStephEvents();
			}
		};

		window.onYouTubeIframeAPIReady = function () {
			player = new YT.Player('player', {
				height: '100%',
				width: '100%',
				videoId: 'tvN-EYgYSZI',
				events: {
					'onReady': onPlayerReady,
					'onStateChange': onPlayerStateChange
				}
			});
		};
	}

	function init() {
		var w = document.getElementById('container').offsetWidth;
		// const ratio = window.innerHeight > window.innerWidth ? 1 : 0.5625
		outerWidth = w - SECTION_WIDTH - GRAPHIC_MARGIN;
		// outerHeight = outerWidth * ratio
		outerHeight = Math.round(window.innerHeight - GRAPHIC_MARGIN * 2 - TOOLTIP_HEIGHT);
		radiusSmall = Math.max(4, Math.round(outerHeight / 200));
		radiusLarge = Math.round(radiusSmall * RADIUS_FACTOR);

		d3.json('data/output.json', handleDataLoaded);

		setupYoutube();
	}

	init();
})();
