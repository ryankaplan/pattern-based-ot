enum ComparisonResult {
  GREATER_THAN,
  EQUAL,
  LESS_THAN
}

function compare(first:any, second:any):ComparisonResult {
  if (first < second) {
    return ComparisonResult.LESS_THAN;
  } else if (first > second) {
    return ComparisonResult.GREATER_THAN;
  }
  return ComparisonResult.EQUAL;
}

class IDGenerator {
  constructor(private _counter:number = -1) {
  }

  next():number {
    this._counter += 1;
    return this._counter;
  }
}
