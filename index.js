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

// go thru each year, find the team, calculate wins back and rank
const output = sinceMerger.reduce((previous, current, index) => {
	const season = current.Season
	const seasonYear = (+season.split('-')[0] + 1).toString()
	const sortedWins = sortedWinsBySeason[index]
	const maxWins = sortedWins[0]

	const teams = getTeams(current).map(name => {
		const wins = +current[name] || 0
		const gamesBack = wins ? maxWins - wins : false
		const worst = wins ? sortedWins.lastIndexOf(wins) === sortedWins.length - 1 : false
		const first = gamesBack === 0
		const rank = wins ? sortedWins.indexOf(wins) + 1 : false
		return { name, wins, season, seasonYear, gamesBack, rank, worst, first }
	})

	return previous.concat(teams)

}, [])

fs.writeFileSync('./data/output.json', JSON.stringify(output, null, 2))
