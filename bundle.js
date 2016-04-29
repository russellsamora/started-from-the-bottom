'use strict';

(function () {
	var handleDataLoaded = function handleDataLoaded(err, data) {
		var svg = d3.select('.graphic');
		svg.attr('width', 640).attr('height', 480);
	};

	var init = function init() {
		return d3.json('data/output.json', handleDataLoaded);
	};

	init();
})();
