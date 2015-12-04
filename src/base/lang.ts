module Base {
  export function randomString(length: number, chars: string) {
    var result = '';
    for (var i = length; i > 0; --i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    return result;
  }

  export var ALPHA_NUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  export enum ComparisonResult {
    GREATER_THAN,
    EQUAL,
    LESS_THAN
  }

  export function compare(first: any, second: any):ComparisonResult {
    if (first < second) {
      return ComparisonResult.LESS_THAN;
    } else if (first > second) {
      return ComparisonResult.GREATER_THAN;
    }
    return ComparisonResult.EQUAL;
  }

  export class IDGenerator {
    constructor(private _counter:number = -1) {
    }

    next():number {
      this._counter += 1;
      return this._counter;
    }
  }
}
