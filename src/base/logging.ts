function log(...args: any[]): void {
	return console.log && Function.apply.call(console.log, console, arguments);
}

function fail(...args: any[]): void {
	window.console && console.log && Function.apply.call(console.log, console, arguments);
	throw "Failure!!!";
	alert('See console for error');
}

function assert(value: boolean, message: string = 'No message'): void {
  if (!value) {
    throw new Error(message);
  }
}
