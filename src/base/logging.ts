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

var INFO = false;
function infoLog(...args:any[]):void {
  var formattedArgs = ['[' + arguments[0] + ']'];
  for (var i = 1; i < arguments.length; i++) {
    formattedArgs.push(arguments[i]);
  }
  console.log && Function.apply.call(console.log, console, formattedArgs);
}


var DEBUG = false;
function debugLog(...args:any[]):void {
  if (DEBUG) {
    var formattedArgs = ['[' + arguments[0] + ']'];
    for (var i = 1; i < arguments.length; i++) {
      formattedArgs.push(arguments[i]);
    }
    console.log && Function.apply.call(console.log, console, formattedArgs);
  }
}