(function() {
	const handleDataLoaded = (err, data) => {
		const svg = d3.select('.graphic')
		svg
			.attr('width', 640)
			.attr('height', 480)
	}

	const init = () => d3.json('data/output.json', handleDataLoaded)

	init()
})()