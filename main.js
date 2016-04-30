(function() {
	const translate = (x, y) => `translate(${x},${y})`

	const handleDataLoaded = (err, data) => {
		const outerWidth = 640
		const outerHeight = 480
		const margin = { top: 20, right: 40, bottom: 40, left: 40 }
		const chartWidth = outerWidth - margin.left - margin.right
		const chartHeight = outerHeight - margin.top - margin.bottom

		// create containers
		const svg = d3.select('svg')
			.attr('width', outerWidth)
			.attr('height', outerHeight)

		const chart = svg.append('g')
			.attr('class', 'chart')
			.attr('transform', translate(margin.left, margin.top))

		
		const yearFormat = d3.time.format('%Y')

		data = data.map(d => {
			d.seasonFormatted = yearFormat.parse(d.seasonYear)
			return d
		})
		
		// create scales
		const xScale = d3.time.scale()
		const yScale = d3.scale.linear()

		xScale
			.domain(d3.extent(data, d => d.seasonFormatted))
			.range([0, chartWidth])
			.nice()
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

		const line = d3.svg.line()
			.defined(d => d.rank)
			.interpolate('step')
			.x(d => xScale(d.seasonFormatted))
			.y(d => yScale(d.rank))

		chart.append('g')
			.attr('class', 'axis axis--x')
			.attr('transform', translate(0, chartHeight))
			.call(xAxis)

		chart.append('g')
			.attr('class', 'axis axis--y')
			.attr('transform', translate(0, 0))
			.call(yAxis)

		// add data
		const dots = chart.append('g')
			.attr('class', 'dot-group')
		
		data = data.filter(d => d.wins)
		dots.selectAll('.dot')
			.data(data)
		.enter().append('circle')
			.attr('class', 'dot')
			.attr('r', 2)
			.attr('cx', d => xScale(d.seasonFormatted))
			.attr('cy', d => yScale(d.rank))

		const lines = chart.append('g')
			.attr('class', 'line-group')
		
		const test = data.filter(d => d.team === 'CHO')
		
		lines.append('path')
			.datum(test)
			.attr('class', 'line')
			.attr('d', line)

	}

	const init = () => d3.json('data/output.json', handleDataLoaded)

	init()
})()
