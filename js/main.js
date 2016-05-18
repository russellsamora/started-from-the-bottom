(function() {
	const DRAGGABLE = false
	const TEAM_NAME_DICT = { 'ATL': 'Hawks','BOS': 'Celtics','BRK': 'Nets','CHI': 'Bulls','CHO': 'Hornets','CLE': 'Cavaliers','DAL': 'Mavericks','DEN': 'Nuggets','DET': 'Pistons','GSW': 'Warriors','HOU': 'Rockets','IND': 'Pacers','LAC': 'Clippers','LAL': 'Lakers','MEM': 'Grizzlies','MIA': 'Heat','MIL': 'Bucks','MIN': 'Timberwolves','NOP': 'Pelicans','NYK': 'Knicks','OKC': 'Thunder','ORL': 'Magic','PHI': '76ers','PHO': 'Suns','POR': 'Trail Blazers','SAC': 'Kings','SAS': 'Spurs','TOR': 'Raports','UTA': 'Jazz', WAS: 'Wizards' }
	const COUNT_TO_WORD = ['zero', 'one', 'two', 'three', 'four', 'five']
	const STEPS = ['top-and-bottom', 'warriors', 'stretch-single', 'stretch-all', 'stretch-duration', 'stretch-incomplete']
	const SECOND = 1000
	const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 }
	const GRAPHIC_MARGIN = 20
	const DRAKE = 2.8
	const RADIUS_FACTOR = 1.5
	const TOOLTIP_HEIGHT = 18
	const SECTION_WIDTH = 360

	const audioElement = document.querySelector('.sample')

	let isMobile = false
	let singleTeam = 'GSW'
	let radiusSmall = 0
	let radiusLarge = 0
	let previousStep = 0
	let dir = 0
	let data = []
	let dataByTeam = []
	let stretchesCompleted = 0
	let stretchesIncomplete = 0
	let stretchesMedian = 0
	let draked = false
	
	const xScale = d3.time.scale()
	const yScale = d3.scale.linear()
	const yScaleLinear = d3.scale.linear()
	const yearFormat = d3.time.format('%Y')

	let xAxis = null
	let yAxis = null

	const createLine = d3.svg.line()
		.defined(d => d.rank)
		.interpolate('step')
		.x(d => xScale(d.seasonFormatted))
		.y(d => yScale(d.rank))

	const createLineDuration = d3.svg.line()
		.defined(d => d.rank)
		.interpolate('linear')
		.x(d => xScale(d.seasonFormatted))
		.y(d => 0)
			
	function translate(x, y) { 
		return `translate(${x},${y})`
	}

	function cleanData(data) {
		return data.map((d, id) => ({
			...d,
			seasonFormatted: yearFormat.parse(d.seasonYear),
			id,
		}))
	}

	function calculateIncompleteStretch(indices) {
		if (indices.length % 2 === 1) return indices[indices.length - 1]
		return null
	}

	function calculateStretch(team) {
		const indices = team.values.map((v, i) =>
				v.start || v.stop ? i : -1
			)
			.filter(v => v > -1)
		
		const len = indices.length
		const newLen = Math.floor(len / 2) * 2
		const sliced = indices.slice(0, newLen)
		const completed =  sliced
			.map((v, i) => {
				const streak = i % 2 ? v - sliced[i - 1] : -1
				return streak
			})
			.filter(v => v > 0)
			.reduce((previous, current) => previous.concat(current), [])

		return { indices, completed }
	}

	function addStretches(values) {
		let active = 0
		return values.map(season => {
			const { bottom, top } = season
			if (bottom && !active) {
				season.start = true
				season.stretch = true
				active += 1
			} else if (top && active) {
				season.stop = true
				season.stretch = true
				season.stopCount = active
				active = 0
			}
			if (active) {
				season.stretch = true
				active +=1
			}
			return season
		})
	}

	function getStretches(team) {
		const indices = team.stretches.indices

		const len = indices.length
		const newLen = Math.floor(len / 2) * 2
		const sliced = indices.slice(0, newLen)

		const stretches = sliced.map((index, i) => {
			const a = index + 1
			const b = sliced[i - 1]
			return i % 2 ? team.values.slice(b, a) : null
		}).filter(d => d)
		
		return stretches
	}

	function getAverageDiff(count) {
		const diff = count - stretchesMedian
		if (diff < 2) {
			return 'was <strong class="highlight top">quicker</strong> than'
		} else if (diff > 2) {
			return 'took <strong class="highlight bottom">longer</strong> than'
		} else {
			return 'was about'
		}
	}

	function getStepData(step) {
		switch(step) {
		case 'top-and-bottom': {
			return {
				all: [],
				wins: data.filter(d => d.wins),
				stretches: [],
			}
		}
			
		case 'warriors': {
			const team = dataByTeam.filter(d => d.key === 'GSW')
			return {
				all: team,
				wins: team[0].values.filter(d => d.wins),
				stretches: [],
			}
		}
			
		case 'stretch-single': {
			const team = dataByTeam.filter(d => d.key === singleTeam)
			return {
				all: team,
				wins: team[0].values.filter(d => d.wins),
				stretches: getStretches(team[0]),
			}
		}
		
		case 'stretch-all': {
			// TODO can we get first bottom part of completed stretch?
			const stretches = dataByTeam
				.map(getStretches)
				.filter(s => s.length)
				.reduce((previous, current) => previous.concat(current))

			const wins = stretches.reduce((previous, current) => {
				const startAndStop = [current[0], current[current.length - 1]]
				return previous.concat(startAndStop)
			}, [])

			return {
				all: [],
				wins,
				stretches,
			}
		}	

		case 'stretch-normalized': {
			const stretches = dataByTeam
				.map(getStretches)
				.filter(s => s.length)
				.reduce((previous, current) => previous.concat(current))

			const wins = stretches.reduce((previous, current) => {
				const startAndStop = [current[0], current[current.length - 1]]
				return previous.concat(startAndStop)
			}, [])

			return {
				all: [],
				wins,
				stretches,
			}
		}
			
		case 'stretch-duration': {
			const stretches = dataByTeam
				.map(getStretches)
				.filter(s => s.length)
				.reduce((previous, current) => previous.concat(current))
				.map(s => [s[0], s[s.length - 1]])
				.sort((a, b) => +a[0].seasonYear - +b[0].seasonYear)

			const wins = stretches.reduce((previous, current) => previous.concat(current), [])

			return {
				all: [],
				wins,
				stretches,
			}
		}

		case 'stretch-incomplete': {
			const stretches = dataByTeam
				.filter(d => d.incomplete !== null)
				.map(d => [d.values[d.incomplete], d.values[d.values.length - 1]])
				.sort((a, b) => +a[0].seasonYear - +b[0].seasonYear)

			const wins = stretches.map(s => s[0])

			return {
				all: [],
				wins,
				stretches,
			}
		}
			
		default: return {}
		}
	}

	function emptyDash() {
		return `0,${this.getTotalLength()}`
	}

	function tweenDash() {
		const l = this.getTotalLength()
		const i = d3.interpolateString(`0,${l}`, `${l}, ${l}`)
		return (t) => i(t)
	}

	function updateMadlib(stretches) {
		const count = stretches.length
		document.querySelector('.madlib-count').innerHTML = count
			? `have completed the journey from the bottom to the top <strong class='highlight top'>${COUNT_TO_WORD[count]}</strong> time${count === 1 ? '' : 's'} in franchise history.`
			: 'have never completed a journey to the top after starting from the bottom.'

		const recent = count ? stretches[count - 1].length  - 1 : 0
		document.querySelector('.madlib-detail').innerHTML = count
			? `Their most recent ascent ${getAverageDiff(recent)} league average, spanning ${recent} seasons.`
			: 'Maybe next year fellas...'
	}

	function hideAnnotations() {
		d3.selectAll('.annotation')
			.transition()
			.duration(SECOND)
			.ease('elastic')
			.style('opacity', 0)
	}
	
	function enterCircle(d) {
		const tooltipText = d3.select('.tooltip-text')
		const tooltipRect = d3.select('.tooltip-rect')
		const cx = d3.select(this).attr('cx')
		const cy = d3.select(this).attr('cy')
		const r = d3.select(this).attr('r')
		const name = TEAM_NAME_DICT[d.name]
		const year = `‘${d.season.substring(2, d.season.length)}`

		const yr = +d.seasonYear
		const anchor =  yr < 1986 ? 'left' : (yr > 2006 ? 'end' : 'middle')
		
		tooltipText
			.text(`${year} ${name}: `)
			.attr('x', cx)
			.attr('y', cy)
			.attr('dy', -r * 3)
			.attr('text-anchor', anchor)
			.append('tspan')
				.text(`${d.wins} wins`)

		const { x, y, width, height } = tooltipText[0][0].getBBox()

		tooltipRect
			.attr('x', x - 4)
			.attr('y', y - 2)
			.attr('width', width + 8)
			.attr('height', height + 4)
			.attr('class', 'tooltip-rect')

		// update line
		// d3.selectAll('.stretch-path')
		// 	.style('stroke-width', 2)
		// 	.style('stroke-opacity', 0.2)

		// d3.select(`.id-${d.id}`)
		// 	.style('stroke-width', 5)
		// 	.style('stroke-opacity', 0.5)
		
	}

	function exitCircle() {
		d3.select('.tooltip-text').text('')
		d3.select('.tooltip-rect').attr('class', 'tooltip-rect hide')
	}

	function bindTip(selection) {
		if (!isMobile) {
			selection
				.on('mouseenter', enterCircle)
				.on('mouseout', exitCircle)	
		}
	}

	function fadeInAnnotation(selection) {
		if (!isMobile) {
			selection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.style('opacity', 1)	
		}
	}

	function stepGraphic(step) {
		dir = step - previousStep
		previousStep = step

		const chartGroup = d3.select('.chart')
		const allGroup = chartGroup.select('.all-group')
		const winsGroup = chartGroup.select('.wins-group')
		const stretchGroup = chartGroup.select('.stretch-group')


		// DATA
		const stepData = getStepData(STEPS[step])
		const allSelection = allGroup.selectAll('.all').data(stepData.all, (d,i) => d.key ? `${d.key}-${i}` : i)
		const winsSelection = winsGroup.selectAll('.wins').data(stepData.wins, d => d.id)
		const stretchSelection = stretchGroup.selectAll('.stretch').data(stepData.stretches, (d,i) => d.length ? `${d[0].id}` : i)

		// hide all annotations 
		hideAnnotations()

		// UPDATE
		switch(STEPS[step]) {
		case 'top-and-bottom': {
			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', d => yScale(d.rank))
					.call(bindTip)

			winsSelection
				.transition()
				.duration(SECOND)
				.delay(d => d.rank * 50 + (dir === 0 ? 0 : SECOND))
				.ease('quad-in-out')
				.attr('r', radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))
			break
		}
			
		case 'warriors': {
			allSelection.enter()
				.append('path')
					.attr('class', 'all')
					.style('opacity', 0)

			allSelection.attr('d', d => createLine(d.values))
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.style('opacity', 1)

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', d => yScale(d.rank))
					.call(bindTip)

			winsSelection
				.transition()
				.delay((d, i) => SECOND * 1.5 + (i * 50))
				.duration(SECOND * DRAKE)
				.ease('elastic')
				.attr('r', d => d.bottom || d.top ? radiusLarge : radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))

			d3.select('.annotation-73').call(fadeInAnnotation)

			break
		}
		
		case 'stretch-single': {
			allSelection.enter()
				.append('path')
					.attr('class', 'all')

			allSelection
				.attr('d', d => createLine(d.values))

			stretchSelection.enter()
				.append('g').attr('class', 'stretch')
				.append('path')
					.attr('class', 'stretch-path')
					.attr('stroke-width', radiusSmall)

			stretchSelection.select('path')
				.attr('d', createLine)
				.attr('stroke-dasharray', emptyDash)
			
			stretchSelection.select('path')
				.attr('d', createLine)
				.transition()
				.duration(SECOND * DRAKE)
				.ease('quad-in-out')
				.attr('stroke-width', radiusSmall)
				.attrTween('stroke-dasharray', tweenDash)

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', d => yScale(d.rank))
					.attr('cy', d => yScale(d.rank))
					.call(bindTip)

			winsSelection
				.transition()
				.duration(SECOND)
				.ease('elastic')
				.attr('r', d => d.bottom || d.top ? radiusLarge : radiusSmall)
				
			// drake!
			if (stepData.stretches.length && !draked && !isMobile) {
				draked = true
				audioElement.play()
			}

			updateMadlib(stepData.stretches)
			break
		}

		case 'stretch-all': {
			stretchSelection.enter()
				.append('g').attr('class', 'stretch')
				.attr('transform', translate(0, 0))
				.style('opacity', 0)
				.append('path')
					.attr('class', d => `stretch-path id-${d[0].id} id-${d[d.length - 1].id}`)
					.attr('stroke-width', 2)

			stretchSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('transform', translate(0, 0))
				.style('opacity', 1)
			.select('path')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('stroke-width', 2)
				.attr('d', createLine)

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', d => yScale(d.rank))
					.call(bindTip)

			winsSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('r', radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))
			
			d3.selectAll('.axis--y')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.style('opacity', 1)

			break
		}
			
		case 'stretch-duration': {
			stretchSelection.enter()
				.append('g').attr('class', 'stretch')
				.attr('transform', (d, i) => translate(0, yScaleLinear(i)))
				.style('opacity', 0)
				.append('path')
					.attr('class', 'stretch-path')
					.attr('stroke-width', 2)

			stretchSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('transform', (d, i) => translate(0, yScaleLinear(i)))
				.style('opacity', 1)
			.select('path')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('stroke-width', 2)
				.attr('d', createLineDuration)		

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', (d, i) => yScaleLinear(Math.floor(i / 2)))
					.call(bindTip)

			winsSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('r', radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', (d, i) => yScaleLinear(Math.floor(i / 2)))
			
			d3.selectAll('.axis--y')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.style('opacity', 0)

			d3.select('.annotation-paul').call(fadeInAnnotation)
			d3.select('.annotation-clippers').call(fadeInAnnotation)
			d3.select('.annotation-bird').call(fadeInAnnotation)
			d3.select('.annotation-spurs').call(fadeInAnnotation)

			break
		}

		case 'stretch-incomplete': {
			stretchSelection.enter()
				.append('g').attr('class', 'stretch')
				.attr('transform', (d, i) => translate(0, yScaleLinear(i)))
				.style('opacity', 0)
				.append('path')
					.attr('class', 'stretch-path')
					.attr('stroke-width', 2)

			stretchSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('transform', (d, i) => translate(0, yScaleLinear(i)))
				.style('opacity', 1)
			.select('path')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('stroke-width', 2)
				.attr('d', createLineDuration)			

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', (d, i) => yScaleLinear(i))
					.call(bindTip)

			winsSelection
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.ease('quad-in-out')
				.attr('r', radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', (d, i) => yScaleLinear(i))
			
			d3.selectAll('.axis--y')
				.transition()
				.delay(SECOND)
				.duration(SECOND)
				.style('opacity', 0)

			d3.select('.annotation-brooklyn').call(fadeInAnnotation)
			d3.select('.annotation-kobe').call(fadeInAnnotation)
			break
		}
			
		default: return {}
		}

		// EXIT
		allSelection.exit()
			.transition()
			.duration(dir === 0 ? 0 : SECOND)
			.style('opacity', 0)
			.remove()

		winsSelection.exit()
			.transition()
			.duration(dir === 0 ? 0 : SECOND)
			.attr('r', 0)
			.remove()

		stretchSelection.exit()
			.transition()
			.duration(dir === 0 ? 0 : SECOND)
			.style('opacity', 0)
			.remove()
	}

	function setupGraphScroll() {
		const gs = graphScroll()
			.container(d3.select('#container'))
			.graph(d3.select('#graphic'))
			.sections(d3.selectAll('section'))
			.on('active', stepGraphic)
	}

	function setupChart() {
		const svg = d3.select('svg')

		const chartGroup = svg.append('g')
			.attr('class', 'chart')

		chartGroup.append('g')
			.attr('class', 'axis axis--x')

		chartGroup.append('g')
			.attr('class', 'axis axis--y')
			

		chartGroup.append('g')
			.attr('class', 'axis axis--y axis--y-label')
			.append('text')
				.text('Rank (regular season)')
				.attr('dy', '-2em')
				.style('text-anchor', 'middle')

		chartGroup.append('g')
			.attr('class', 'all-group')

		chartGroup.append('g')
			.attr('class', 'stretch-group')

		chartGroup.append('g')
			.attr('class', 'wins-group')

		chartGroup.append('rect')
			.attr('class', 'tooltip-rect')
			.attr('rx', 2)
			.attr('ry', 2)

		chartGroup.append('text')
			.attr('class', 'tooltip-text')
	}

	function resizeChart(w) {
		const sectionWidth = isMobile ? 0 : SECTION_WIDTH
		const graphicMargin = isMobile ? 0 : GRAPHIC_MARGIN
		const tooltipHeight = isMobile ? 0 : TOOLTIP_HEIGHT
		const margin = {
			top: isMobile ? 10 : MARGIN.top,
			left: MARGIN.left,
			bottom: MARGIN.bottom,
			right: isMobile ? 10 : MARGIN.right,
		}		

		const outerWidth = w - sectionWidth - graphicMargin
		const outerHeight = isMobile ? w : Math.round(window.innerHeight - graphicMargin * 2 - tooltipHeight)
		const chartWidth = outerWidth - margin.left - margin.right
		const chartHeight = outerHeight - margin.top - margin.bottom
		radiusSmall = Math.max(2, Math.round(outerHeight / 200))
		radiusLarge = Math.round(radiusSmall * RADIUS_FACTOR)

		d3.select('svg')
			.attr('width', outerWidth)
			.attr('height', outerHeight)

		d3.select('.chart')
			.attr('transform', translate(margin.left, margin.top))
		
		xScale.range([0, chartWidth])

		yScale.range([0, chartHeight])

		yScaleLinear.range([0, chartHeight])

		d3.select('.axis--x')
			.attr('transform', translate(0, chartHeight))
			.call(xAxis)

		d3.select('.axis--y')
			.attr('transform', translate(0, 0))
			.call(yAxis)

		d3.select('.axis--y-label')
			.attr('transform', translate(0, Math.floor(chartHeight / 2)) + ' rotate(-90)')

		// d3.selectAll('.annotations-rank')
		// 	.attr('transform', function(d) {
		// 		console.log(d)
		// 		return 'translate(' + xScale(yearFormat.parse(d.x)) + ',' + yScale(d.yVal) + ')'
		// 	})

		// d3.selectAll('.annotations-order')
		//     .attr('transform', d => {
		//     	console.log(d)
		//     	return 'translate(' + xScale(yearFormat.parse(d.x)) + ',' + yScaleLinear(d.y) + ')'
		// 	})

		setupGraphScroll()
	}

	function handleDataLoaded(err, result) {
		data = cleanData(result)
		
		const byTeam = d3.nest()
			.key(d => d.name)
			.entries(data)

		dataByTeam = byTeam
			.map(d => ({
				...d,
				values: addStretches(d.values),
			}))
			.map(d => ({
				...d,
				stretches: calculateStretch(d),
			}))
			.map(d => ({
				...d,
				incomplete: calculateIncompleteStretch(d.stretches.indices),
			}))

		const complete = dataByTeam.reduce((previous, current) => previous.concat(current.stretches.completed), [])

		stretchesCompleted = complete.length
		stretchesMedian = d3.median(complete)
		stretchesIncomplete = dataByTeam.reduce((previous, current) => current.incomplete !== null ? previous += 1 : previous, 0)

		xScale.domain(d3.extent(data, d => d.seasonFormatted))
		yScale.domain([1, data.filter(d => d.season === '2015-16').length + 1])
		yScaleLinear.domain([0, stretchesCompleted])

		xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom')
			.tickFormat(d3.time.format('%Y'))

		yAxis = d3.svg.axis()
			.scale(yScale)
			.orient('left')
			.tickValues([1, 5, 10, 15, 20, 25, 30])

		createDropdown()
		handleResize()
		setupSwoopyDrag()
	}

	function createDropdown() {
		const el = document.querySelector('.madlib-name')
		const html = Object.keys(TEAM_NAME_DICT).map(key => {
			const selected = key === 'GSW' ? ' selected' : ''
			return `<option${selected} value='${key}'>${TEAM_NAME_DICT[key]}</option>`
		}).join('\n')
		el.innerHTML = html

		el.addEventListener('change', function() {
			// only change if on 2nd slide
			singleTeam = this.value
			if (previousStep === 2) stepGraphic(2)
		})

		// set first madlib
		const team = dataByTeam.filter(d => d.key === 'GSW')
		updateMadlib(getStretches(team[0]))

		// total madlib
		document.querySelector('.madlib-total').textContent = stretchesCompleted
		document.querySelector('.madlib-median').textContent = stretchesMedian
	}

	function handleResize() {
		const w = document.getElementById('container').offsetWidth
		isMobile = w < 850
		if(data.length) resizeChart(w)
	}

	function setupSwoopyDrag() {
		d3.select('.chart').append('marker')
		    .attr('id', 'arrow')
		    .attr('viewBox', '-10 -10 20 20')
		    .attr('markerWidth', 20)
		    .attr('markerHeight', 20)
		    .attr('orient', 'auto')
		  .append('path')
		    .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')

		
		const swoopyRank = d3.swoopyDrag()
		    .x(d => xScale(yearFormat.parse(d.x)))
		    .y(d => yScale(d.y))
		    .draggable(DRAGGABLE)
		    .annotations(annotationsRank)
		    .className(d => d.className)

		const swoopyRankSel = d3.select('.chart').append('g')
				.attr('class', 'annotations annotations-rank')
				.call(swoopyRank)

		swoopyRankSel.selectAll('path')
			.attr('marker-end', 'url(#arrow)')

		const swoopyOrder = d3.swoopyDrag()
		    .x(d => xScale(yearFormat.parse(d.x)))
		    .y(d => yScaleLinear(d.y))
		    .draggable(DRAGGABLE)
		    .annotations(annotationsOrder)
		    .className(d => d.className)

		const swoopyOrderSel = d3.select('.chart').append('g')
				.attr('class', 'annotations annotations-order')
				.call(swoopyOrder)

		swoopyOrderSel.selectAll('path')
			.attr('marker-end', 'url(#arrow)')
	}

	function setupYoutube() {
		const tag = document.createElement('script')

		tag.src = 'https://www.youtube.com/iframe_api'
		const firstScriptTag = document.getElementsByTagName('script')[0]
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

		let player = null
		let ready = false
		
		const setupStephEvents = () => {
			const steph = document.querySelector('.stephen-curry')
			const youtube = document.querySelector('.youtube')
			steph.addEventListener('mouseenter', (event) => {
				youtube.classList.remove('transparent')
				player.playVideo()
			})
			steph.addEventListener('mouseout', (event) => {
				youtube.classList.add('transparent')
				player.pauseVideo()
			})
		}
		
		const onPlayerReady = (event) => {
			// console.log('player ready', event)
		  	player.mute()
		  	player.playVideo()
		}

		const onPlayerStateChange = (event) => {
			// console.log('player statechange' , event)
			if (!ready && event.data === 1) {
				ready = true
				player.pauseVideo()
				player.unMute()
				player.setVolume(50)
				setupStephEvents()
			}
		}

		window.onYouTubeIframeAPIReady = () => {
			player = new YT.Player('player', {
				height: '100%',
				width: '100%',
				videoId: 'tvN-EYgYSZI',
				events: {
					'onReady': onPlayerReady,
					'onStateChange': onPlayerStateChange,
				},
			})
		}
	}

 	function init() {
 		setupChart()
 		window.addEventListener('resize', handleResize)
		d3.json('data/output.json', handleDataLoaded)
		if (!isMobile) setupYoutube()
	}

	init()
})()
