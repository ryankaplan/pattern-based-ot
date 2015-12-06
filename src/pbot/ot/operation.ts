/// <reference path='../../base/lang.ts' />
/// <reference path='../../base/logging.ts' />

class Timestamp {
  private _totalOrderingId:number = null;

  constructor(private _siteId: string,
              private _siteOpId: number,
              private _remoteTotalOrderingId: number) {
  }

  initWithJson(parsed:any):void {
    this._siteId = parsed['siteId'];
    this._siteOpId = parsed['siteOpId'];
    this._totalOrderingId = parsed['totalOrderingId'];
    this._remoteTotalOrderingId = parsed['remoteTotalOrderingId'];
  }

  fillJson(json:any):void {
    json['siteId'] = this._siteId;
    json['siteOpId'] = this._siteOpId;
    json['totalOrderingId'] = this._totalOrderingId;
    json['remoteTotalOrderingId'] = this._remoteTotalOrderingId;
  }

  copy(other:Timestamp):void {
    this._siteId = other._siteId;
    this._siteOpId = other._siteOpId;
    this._remoteTotalOrderingId = other._remoteTotalOrderingId;
    this._totalOrderingId = other._totalOrderingId;
  }

  static compare(first:Timestamp, second:Timestamp): Base.ComparisonResult {
    var firstHasTotalOrderingId = first !== null && first._totalOrderingId !== null;
    var secondHasTotalOrderingId = second !== null && second._totalOrderingId != null;

    if (!firstHasTotalOrderingId && !secondHasTotalOrderingId) {
      fail("Neither operand in Timestamp.compare has a total ordering id!");
    }

    if (!firstHasTotalOrderingId) {
      return Base.ComparisonResult.GREATER_THAN;
    }

    if (!secondHasTotalOrderingId) {
      return Base.ComparisonResult.LESS_THAN;
    }

    return Base.compare(first._totalOrderingId, second._totalOrderingId);
  }

  siteId(): string {
    return this._siteId;
  }

  siteOpId():number {
    return this._siteOpId;
  }

  remoteTotalOrderingId():number {
    return this._remoteTotalOrderingId;
  }

  totalOrderingId():number {
    return this._totalOrderingId;
  }

  setTotalOrderingId(totalOrderingId_:number) {
    this._totalOrderingId = totalOrderingId_;
  }
}

module OperationBase {

  // Operation base class
  export abstract class Operation {
    protected _timestamp: Timestamp;

    initWithJson(parsed: any) {
      if (parsed['timestamp'] !== null) {
        this._timestamp = new Timestamp(null, null, null);
        this._timestamp.initWithJson(parsed['timestamp']);
      }
    }

    fillJson(json: any) {
      if (this._timestamp) {
        json['timestamp'] = {};
        this._timestamp.fillJson(json['timestamp']);
      }
    }

    copy(other: Operation) {
      if (other._timestamp) {
        this._timestamp = new Timestamp(null, null, null);
        this._timestamp.copy(other._timestamp);
      }
    }

    public timestamp(): Timestamp {
      return this._timestamp;
    }

    public setTimestamp(timestamp: Timestamp):void {
      this._timestamp = timestamp;
    }

    public abstract transform(other: Operation): Operation;
  }

  // Operation Model base class
  export interface Model {
    execute(op: Operation): void;
  }
}

