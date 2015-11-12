function log(...args:any[]):void {
  console.log && Function.apply.call(console.log, console, arguments);
}

function fail(...args:any[]):void {
  console.log && Function.apply.call(console.log, console, arguments);
  throw "Failure!!!";
  alert('See console for error');
}

function assert(value:boolean, message:string = 'No message'):void {
  if (!value) {
    throw new Error(message);
  }
}

var DEBUG = true;
function debug(...args:any[]):void {
  if (DEBUG) {
    Function.apply.call(log, null, arguments);
  }
}