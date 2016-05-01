const fs = require('fs')
const csvParse = require('d3-dsv').csvParse

const csvData = fs.readFileSync('./data/nba-franchise-win-totals.csv', 'utf8')
const data = csvParse(csvData)

// where the team starts so we can strip out other properties
const firstTeamIndex = 3

// turn team names into array
const getTeams = obj => Object.keys(obj).slice(firstTeamIndex)

// filter to seasons since the merger (1976)
const sinceMerger = data.filter(d => +(d.Season.split('-')[0]) > 1975)

// sorted wins each season
const sortedWinsBySeason = sinceMerger.map(d =>
	getTeams(d)
		.map(name => +d[name] || 0)
		.filter(wins => wins > 0)
		.sort((a, b) => b - a)
)

// how many teams were active during each season
const activeTeamsBySeason = sinceMerger.map(d =>
	getTeams(d)
	.map(team => d[team] || 0)
	.filter(wins => wins > 0)
	.length 
)

// go thru each year, find the team, calculate wins back and rank
const output = sinceMerger.reduce((previous, current, index) => {
	const season = current.Season
	const seasonYear = (+season.split('-')[0] + 1).toString()
	const sortedWins = sortedWinsBySeason[index]
	const activeTeams = activeTeamsBySeason[index]
	const maxWins = sortedWins[0]

	const teams = getTeams(current).map(name => {
		const wins = +current[name] || 0
		const gamesBack = wins ? maxWins - wins : undefined
		const worst = wins ? sortedWins.lastIndexOf(wins) === sortedWins.length - 1 : undefined
		const first = gamesBack === 0
		const placeFront = sortedWins.indexOf(wins)
		const placeBack = sortedWins.lastIndexOf(wins)
		const rank = wins ? placeFront + 1 : undefined
		const top = wins ? placeFront < 4 : undefined
		const bottom = wins ? activeTeams - placeBack < 5 : undefined
		return { name, wins, season, seasonYear, gamesBack, rank, worst, first, top, bottom }
	})

	return previous.concat(teams)

}, [])

fs.writeFileSync('./data/output.json', JSON.stringify(output, null, 2))
