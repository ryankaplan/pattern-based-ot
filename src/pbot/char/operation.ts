/// <reference path='../operation.ts' />
/// <reference path='../../base/list.ts' />
/// <reference path='../../base/logging.ts' />

module Char {
  export enum OperationType {
    NOOP,
    INSERT,
    DELETE
  }

  export class Operation extends OperationBase.Operation {
    constructor(private _type:OperationType,
                private _char:string, // null for DELETE
                private _location:number) {
      super()
    }

    static Noop() {
      return new Operation(OperationType.NOOP, null, null);
    }

    static Insert(char:string, location:number) {
      return new Operation(OperationType.INSERT, char, location);
    }

    static Delete(location:number) {
      return new Operation(OperationType.DELETE, null, location);
    }

    initWithJson(parsed:any):void {
      this._type = parsed['type'];
      this._char = parsed['char'];
      this._location = parsed['location'];
      super.initWithJson(parsed);
    }

    fillJson(json:any):void {
      json['type'] = this._type;
      json['char'] = this._char;
      json['location'] = this._location;
      super.fillJson(json);
    }

    copy(other: Operation):void {
      this._type = other._type;
      this._char = other._char;
      this._location = other._location;
      super.copy(other);
    }

    //////////////////////////////////////////////////////////////////

    readableType(): string {
      switch (this._type) {
        case OperationType.INSERT: return 'INSERT';
        case OperationType.DELETE: return 'DELETE';
        case OperationType.NOOP: return 'NOOP';
      }
    }

    type(): OperationType {
      return this._type;
    }

    char(): string {
      return this._char;
    }

    location(): number {
      return this._location;
    }

    isDelete(): boolean {
      return this._type === OperationType.DELETE;
    }

    isInsert(): boolean {
      return this._type === OperationType.INSERT;
    }

    isNoop(): boolean {
      return this._type === OperationType.NOOP;
    }

    // Transform works for two operations a and b such that
    //
    // tA = a.transform(b)
    // tB = b.transform(a)
    //
    // and applying a and then tB to a document has the same result
    // as a applying b and then tA.

    transform(other_: OperationBase.Operation): Operation {
      let other = <Operation>other_;
      let copy = new Operation(null, null, null);
      copy.copy(this);

      if (DEBUG) {
        let jsonThis = {};
        this.fillJson(jsonThis);

        let jsonOther = {};
        other.fillJson(jsonOther);

        debugLog('About to transform operations');
        debugLog('This: ', JSON.stringify(jsonThis));
        debugLog('Other: ', JSON.stringify(other));
      }

      if (this.isNoop() || other.isNoop()) {
        return copy;
      }

      let locationRelation = Base.compare(this.location(), other.location());

      if (this.isInsert() && other.isInsert()) {
        if (locationRelation === Base.ComparisonResult.GREATER_THAN) {
          copy._location += 1;
        } else if (locationRelation === Base.ComparisonResult.EQUAL && this._char > other._char) {
          copy._location += 1;
        }
      }

      else if (this.isDelete() && other.isInsert()) {
        // Insert operations are applied before delete operations when there's a location tie
        if (locationRelation === Base.ComparisonResult.GREATER_THAN || locationRelation === Base.ComparisonResult.EQUAL) {
          copy._location += 1;
        }
      }

      else if (this.isInsert() && other.isDelete()) {

        // Insert operations are applied before delete operations when there's a location tie
        if (locationRelation === Base.ComparisonResult.GREATER_THAN) {
          copy._location -= 1;
        }
      }

      else if (this.isDelete() && other.isDelete) {
        if (locationRelation === Base.ComparisonResult.LESS_THAN) {
          // Do nothing
        } else if (locationRelation === Base.ComparisonResult.GREATER_THAN) {
          copy._location -= 1;
        } else {
          copy._type = OperationType.NOOP;
          copy._char = null;
          copy._location = null;
        }

        // if the location is equal, these ops commute

      } else {
        fail("Unrecognized operation types " + this.type() + " " + other.type());
      }


      debugLog('TextOp', 'Returning from transform ' + JSON.stringify(copy));
      return copy;
    }
  }
}
