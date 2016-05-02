(function() {
	const TEAM_NAME_DICT = { 'ATL': 'Hawks','BOS': 'Celtics','BRK': 'Nets','CHI': 'Bulls','CHO': 'Hornets','CLE': 'Cavaliers','DAL': 'Mavericks','DEN': 'Nuggest','DET': 'Pistons','GSW': 'Warriors','HOU': 'Rockets','IND': 'Pacers','LAC': 'Clippers','LAL': 'Lakers','MEM': 'Grizzlies','MIA': 'Heat','MIL': 'Bucks','MIN': 'Timberwolves','NOP': 'Pelicans','NYK': 'Knicks','OKC': 'Thunder','ORL': 'Magic','PHI': '76ers','PHO': 'Suns','POR': 'Trail Blazers','SAC': 'Kings','SAS': 'Spurs','TOR': 'Raports','UTA': 'Jazz', WAS: 'Wizards' }
	const COUNT_TO_WORD = ['zero', 'one', 'two', 'three', 'four', 'five']
	const STEPS = ['top-and-bottom', 'warriors', 'stretch-single', 'stretch-all', 'stretch-normalized', 'stretch-duration']
	const SECOND = 1000
	const EXIT_DURATION = SECOND
	const MARGIN = { top: 20, right: 40, bottom: 40, left: 40 }
	const GRAPHIC_MARGIN = 20
	const RATIO = 16 / 9
	const SECTION_WIDTH = 320
	
	let singleTeam = 'GSW'
	let outerWidth = 0
	let outerHeight = 0
	let radiusSmall = 0
	let radiusLarge = 0
	let previousStep = 0
	let dir = 0
	let chartWidth = 0
	let chartHeight = 0
	let data = []
	let dataByTeam = []
	let svg = null
	let stretchesCompleted = 0
	let stretchesMedian = 0
	
	const INTERPOLATE = 'step'
	const xScale = d3.time.scale()
	const yScale = d3.scale.linear()
	// const createLineAll = d3.svg.line()
	// 	.defined(d => d.rank)
	// 	.interpolate(INTERPOLATE)
	// 	.x(d => xScale(d.seasonFormatted))
	// 	.y(d => yScale(d.rank))

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
		let active = false
		return values.map(season => {
			const { bottom, top } = season
			if (bottom && !active) {
				season.start = true
				season.stretch = true
				active = true
			} else if (top && active) {
				season.stop = true
				season.stretch = true
				active = false
			}
			if (active) season.stretch = true
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
			return 'shorter than'
		} else if (diff > 2) {
			return 'longer than'
		} else {
			return 'about'
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
			
		case 'stretch-normalized': {

		}
			
		case 'stretch-duration': {

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
			.ease('quad-in-out')
			.duration(SECOND * 3)
			.attrTween('stroke-dasharray', tweenDash)
	}

	function stepGraphic(step) {
		dir = step - previousStep
		previousStep = step

		const chartGroup = svg.select('.chart')
		const allGroup = chartGroup.select('.all-group')
		const winsGroup = chartGroup.select('.wins-group')
		const stretchGroup = chartGroup.select('.stretch-group')

		// DATA
		const stepData = getStepData(STEPS[step])		
		const allSelection = allGroup.selectAll('.all').data(stepData.all)
		const winsSelection = winsGroup.selectAll('.wins').data(stepData.wins, d => d.id)
		const stretchSelection = stretchGroup.selectAll('.stretch').data(stepData.stretches)

		console.log(stepData)

		// UPDATE
		switch(STEPS[step]) {
		case 'top-and-bottom': {
			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cx', d => xScale(d.seasonFormatted))
					.attr('cy', d => yScale(d.rank))

			winsSelection
				.transition()
				.duration(SECOND * 2)
				.delay(d => d.rank * 75 + (dir === 0 ? 0 : EXIT_DURATION))
				.ease('quad-in-out')
				.attr('r', radiusSmall)
			break
		}
			
		case 'warriors': {
			allSelection.enter()
				.append('path')
					.attr('class', 'all')

			allSelection.attr('d', d => createLine(d.values))
				.call(transitionPath)

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cy', d => yScale(d.rank))

			winsSelection
				.transition()
				.delay(EXIT_DURATION)
				.duration(SECOND * 2)
				.ease('elastic')
				.attr('r', d => d.bottom || d.top ? radiusLarge : radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))
			break
		}
		
		case 'stretch-single': {
			allSelection.enter()
				.append('path')
					.attr('class', 'all')

			allSelection
				.attr('d', d => createLine(d.values))

			stretchSelection.enter()
				.append('path')
					.attr('class', 'stretch')

			stretchSelection.attr('d', d => createLine(d))
				.call(transitionPath)

			winsSelection.enter()
				.append('circle')
					.attr('class', d => `wins ${d.bottom ? 'bottom' : ''} ${d.top ? 'top' : ''}`)
					.attr('r', 0)
					.attr('cy', d => yScale(d.rank))

			winsSelection
				.transition()
				.delay(dir === 0 ? 0 : EXIT_DURATION)
				.duration(SECOND * 2)
				.ease('elastic')
				.attr('r', d => d.bottom || d.top ? radiusLarge : radiusSmall)
				.attr('cx', d => xScale(d.seasonFormatted))
				.attr('cy', d => yScale(d.rank))

			const count = stepData.stretches.length
			document.querySelector('.madlib-count').innerHTML = count
				? `have made their journey from the bottom to the top <strong class='top'>${COUNT_TO_WORD[count]}</strong> time${count === 1 ? '' : 's'} in franchise history.`
				: 'have never completed their quest to finish in the top four after starting from the bottom.'

			const recent = count ? stepData.stretches[count - 1].length  - 1 : 0
			document.querySelector('.madlib-detail').innerHTML = count
				? `Their most recent ascent was ${getAverageDiff(recent)} average, spanning <strong class='bottom'>${recent}</strong> seasons.`
				: 'Maybe next year will be their year...'
			break
		}

		case 'stretch-all': {
			break
		}
			
		case 'stretch-normalized': {
			break
		}
			
		case 'stretch-duration': {
			break
		}
			
		default: return {}
		}

		// EXIT
		allSelection.exit()
			.transition()
			.duration(EXIT_DURATION)
			.style('opacity', 0)
			.remove()

		stretchSelection.exit()
			.transition()
			.duration(EXIT_DURATION)
			.style('opacity', 0)
			.remove()

		winsSelection.exit()
			.transition()
			.duration(EXIT_DURATION)
			.style('opacity', 0)
			.remove()
		
	}

	function updateSingleStep() {
		singleTeam = this.value
		if (previousStep === 2) stepGraphic(2)
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
		
		const byTeam = d3.nest()
			.key(d => d.name)
			.entries(data)

		dataByTeam = byTeam
			.map(d => {
				d.values = addStretches(d.values)
				return d
			})
			.map(d => {
				const { indices, completed } = calculateStretch(d)
				d.stretches = { indices, completed } 
				return d
			})

		const comp = dataByTeam.reduce((previous, current) => previous.concat(current.stretches.completed), [])
		stretchesMedian = d3.median(comp)
		stretchesCompleted = comp.length

		// setup chart
		chartWidth = outerWidth - MARGIN.left - MARGIN.right
		chartHeight = outerHeight - MARGIN.top - MARGIN.bottom

		// create containers
		svg = d3.select('svg')
			.attr('width', outerWidth)
			.attr('height', outerHeight)

		const chartGroup = svg.append('g')
			.attr('class', 'chart')
			.attr('transform', translate(MARGIN.left, MARGIN.top))
		
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
			.attr('class', 'all-group')

		chartGroup.append('g')
			.attr('class', 'stretch-group')

		chartGroup.append('g')
			.attr('class', 'wins-group')

		setupGraphScroll()
	}

	function createDropdown() {
		const el = document.querySelector('.madlib-name')
		const html = Object.keys(TEAM_NAME_DICT).map(key => {
			const selected = key === 'GSW' ? ' selected' : ''
			return `<option${selected} value='${key}'>${TEAM_NAME_DICT[key]}</option>`
		}).join('\n')
		el.innerHTML = html

		el.addEventListener('change', updateSingleStep)
	}

	function init() {
		const w = document.getElementById('container').offsetWidth
		outerWidth = w - SECTION_WIDTH - GRAPHIC_MARGIN
		outerHeight = Math.round(window.innerHeight - GRAPHIC_MARGIN * 2)
		radiusSmall = Math.max(4, Math.round(outerHeight / 200))
		radiusLarge = Math.round(radiusSmall * 1.5)

		createDropdown()
		d3.json('data/output.json', handleDataLoaded)
	}

	init()
})()
