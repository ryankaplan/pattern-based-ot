function assert(value: boolean, message: string = 'No message'): void {
  if (!value) {
    throw new Error(message);
  }
}

function fail(data: any) {
  var dataToThrow: any = null;
  if (typeof data === 'string') {
    dataToThrow = JSON.stringify({ message: data });
  } else {
    dataToThrow = JSON.stringify(data);
  }
  
  throw new Error('FAILURE DATA: ' + JSON.stringify(dataToThrow));
}

enum ComparisonResult {
  GREATER_THAN,
  EQUAL,
  LESS_THAN
}