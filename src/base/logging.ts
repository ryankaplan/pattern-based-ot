function log(...args: any[]): void {
	return window.console && console.log && Function.apply.call(console.log, console, arguments);
}

function fail(...args: any[]): void {
	window.console && console.log && Function.apply.call(console.log, console, arguments);
	throw "Failure!!!";
	alert('See console for error');
}