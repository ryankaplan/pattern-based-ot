module Base {
  export function randomString(length: number, chars: string) {
    var result = '';
    for (var i = length; i > 0; --i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    return result;
  }

  export var ALPHA_NUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  export class NumberIdGenerator {
    constructor(private _counter: number = -1) {
    }

    next(): number {
      this._counter += 1;
      return this._counter;
    }
  }

  export enum ComparisonResult {
    GREATER_THAN,
    EQUAL,
    LESS_THAN
  }

  export function allPairs(arr1: Array<any>, arr2: Array<any>) {
    let res: Array<Array<any>> = [];
    for (var first of arr1) {
      for (var second of arr2) {
        res.push([first, second]);
      }
    }
    return res;
  }

  export function compare(first: any, second: any): ComparisonResult {
    if (first < second) {
      return ComparisonResult.LESS_THAN;
    } else if (first > second) {
      return ComparisonResult.GREATER_THAN;
    }
    return ComparisonResult.EQUAL;
  }

  export interface Copyable {
    copy(): Copyable;
  }

  export function objEquals<T>(
    a: { [key: string]: T },
    b: { [key: string]: T },
    eq: (a: T, b: T) => boolean): boolean
  {
      let aKeys = Object.keys(a);
      let bKeys = Object.keys(b);
      if (!listEqual(aKeys, bKeys)) {
        return false;
      }

      for (var key in a) {
        if (!eq(a[key], b[key])) {
          return false;
        }
      }
      return true;
  }
}
