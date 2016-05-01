(function() {
	const STEPS = ['top-and-bottom', 'path-single', 'path-all', 'path-normalized', 'path-duration']
	const RADIUS_LARGE = 6
	const RADIUS_SMALL = 4
	const SECOND = 1000
	const EXIT_DURATION = SECOND
	// let currentStep = null
	let data = []
	let dataByTeam = []
	let svg = null
	
	const INTERPOLATE = 'step'
	const xScale = d3.time.scale()
	const yScale = d3.scale.linear()
	const createLine = d3.svg.line()
		.defined(d => d.rank)
		.interpolate(INTERPOLATE)
		.x(d => xScale(d.seasonFormatted))
		.y(d => yScale(d.rank))

	function translate(x, y) { 
		return `translate(${x},${y})`
	}

	function cleanData(data) {
		const yearFormat = d3.time.format('%Y')
		return data.map((d, index) => {
			d.seasonFormatted = yearFormat.parse(d.seasonYear)
			d.id = index
			return d
		})	
	}

	function createDropdown() {
		const options = dataByTeam.map(team =>
			`<option>${team.key}</option>`
		).join()
		const el = document.querySelector('.teams')
		el.innerHTML = options
		el.addEventListener('change', e => {
			const text = e.target.options[e.target.selectedIndex].text
			drawTeam(text)
		})
	}

	function drawTeam(name) {
		// const chartGroup = svg.select('.chart')
		// const lineGroup = chartGroup.select('.line-group')
		// const dotGroup = chartGroup.select('.dot-group')

		// const oneTeam = dataByTeam.filter(d => d.key === name)
		
		// // DATA
		// const lineSelection = lineGroup.selectAll('.line').data(oneTeam)

		// // UPDATE

		// // ENTER
		// lineSelection.enter()
		// 	.append('path')
		// 		.attr('class', 'line')

		// // ENTER + UPDATE
		// lineSelection.attr('d', d => createLine(d.values))

		// // EXIT
		// lineSelection.exit().remove()

		// const dataWithWins = oneTeam[0].values.filter(d => d.wins)
		// // const dataWithWins = dataWithSeason.filter(d => d.wins)

		// const dotSelection = dotGroup.selectAll('.dot').data(dataWithWins)
		
		// dotSelection.enter()
		// 	.append('circle')
		// 	.attr('class', 'dot')

		// dotSelection
		// 	// .attr('class', d => `dot ${d.worst ? 'worst' : ''} ${d.first ? 'first' : ''}`)
		// 	.attr('class', d => `dot ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
		// 	.attr('r', 4)
		// 	.attr('cx', d => xScale(d.seasonFormatted))
		// 	.attr('cy', d => yScale(d.rank))

		// dotSelection.exit().remove()
	}

	function getStepData(step) {	
		switch(step) {
		case 'top-and-bottom': {
			return {
				line: [],
				dot: data.filter(d => d.wins),
			}
		}
			
		case 'path-single': {
			const team = dataByTeam.filter(d => d.key === 'GSW')
			return {
				line: team,
				dot: team[0].values.filter(d => d.wins),
			}
		}
			
		case 'path-all': {

		}
			
		case 'path-normalized': {

		}
			
		case 'path-duration': {

		}
			
		default: return {}
		}
	}

	function tweenDash() {
		const l = this.getTotalLength()
		const i = d3.interpolateString(`0,${l}`, `${l}, ${l}`)
		return (t) => i(t)
	}

	function transitionPath(path) {
		path.transition()
			.duration(SECOND * 4)
			.attrTween('stroke-dasharray', tweenDash)
	}

	function stepGraphic(index) {
		const chartGroup = svg.select('.chart')
		const lineGroup = chartGroup.select('.line-group')
		const dotGroup = chartGroup.select('.dot-group')

		// DATA
		const stepData = getStepData(STEPS[index])		
		const lineSelection = lineGroup.selectAll('.line').data(stepData.line)
		const dotSelection = dotGroup.selectAll('.dot').data(stepData.dot, d => d.id)
		console.log(dotSelection)

		// ENTER
		lineSelection.enter()
			.append('path')
				.attr('class', 'line')

		dotSelection.enter()
			.append('circle')
			.attr('class', d => `dot ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
			.attr('r', 0)

		// UPDATE
		switch(STEPS[index]) {
		case 'top-and-bottom': {
			dotSelection
				.transition()
				.delay(EXIT_DURATION)
				.duration(SECOND * 2)
				.ease('cubic-out')
				.attr('r', RADIUS_SMALL)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))
			break
		}
			
		case 'path-single': {
			lineSelection.attr('d', d => createLine(d.values))
				.call(transitionPath)

			dotSelection
				.transition()
				.delay(EXIT_DURATION)
				.duration(SECOND * 2)
				.ease('cubic-out')
				.attr('r', d => d.bottom || d.top ? RADIUS_LARGE : RADIUS_SMALL)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))
			break
		}
			
		case 'path-all': {
			break
		}
			
		case 'path-normalized': {
			break
		}
			
		case 'path-duration': {
			break
		}
			
		default: return {}
		}

		// EXIT
		lineSelection.exit().remove()

		dotSelection
			.exit()
			.transition()
			.duration(EXIT_DURATION)
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

	function handleDataLoaded(err, result) {
		data = cleanData(result)
		
		dataByTeam = d3.nest()
			.key(d => d.name)
			.entries(data)

		// setup chart
		const outerWidth = 960
		const outerHeight = 540
		const margin = { top: 20, right: 40, bottom: 40, left: 40 }
		const chartWidth = outerWidth - margin.left - margin.right
		const chartHeight = outerHeight - margin.top - margin.bottom

		// create containers
		svg = d3.select('svg')
			.attr('width', outerWidth)
			.attr('height', outerHeight)

		const chartGroup = svg.append('g')
			.attr('class', 'chart')
			.attr('transform', translate(margin.left, margin.top))
		
		xScale
			.domain(d3.extent(data, d => d.seasonFormatted))
			.range([0, chartWidth])
			// .nice()
		yScale
			.domain([1, data.filter(d => d.season === '2015-16').length + 1])
			// .domain(d3.extent(data, d => d.gamesBack))
			.range([0, chartHeight])

		// create axis
		const xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom')
			.tickFormat(d3.time.format('‘%y'))

		const yAxis = d3.svg.axis()
			.scale(yScale)
			.orient('left')
			.tickValues([1, 5, 10, 15, 20, 25, 30])

		chartGroup.append('g')
			.attr('class', 'axis axis--x')
			.attr('transform', translate(0, chartHeight))
			.call(xAxis)

		chartGroup.append('g')
			.attr('class', 'axis axis--y')
			.attr('transform', translate(0, 0))
			.call(yAxis)

		chartGroup.append('g')
			.attr('class', 'line-group')

		chartGroup.append('g')
			.attr('class', 'dot-group')

		// createDropdown()
		setupGraphScroll()
	}

	function init() {
		d3.json('data/output.json', handleDataLoaded)
	}

	init()
})()
