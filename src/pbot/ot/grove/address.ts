module Grove {
  export class Address {
    constructor(
      private _id: string,
      private _path: Array<number>
    ) {}

    initWithJson(parsed: any): void {
      this._id = parsed['id'];
      this._path = parsed['path'].slice(0);
    }

    fillJson(json: any): void {
      json['id'] = this._id;
      json['path'] = this._path.slice(0);
    }

    copy(other: Address):void {
      this._id = other._id;
      this._path = other._path.slice(0);
    }

    setId(id: string) { this._id = name; }
    setPath(path: Array<number>) { this._path = path; }

    id(): string { return this._id; }
    path(): Array<number> { return this._path; }
  }

  export enum ComparisonResultType {
    DIFFERENT,
    SAME,
    PREFIX,
    SUFFIX
  }

  export interface ComparisonResult {
    type: ComparisonResultType;
    value: number;
  }

  export function compare(a: Address, b: Address): ComparisonResult {
    if (a.id() !== b.id()) {
      return { type: ComparisonResultType.DIFFERENT,  value: null };
    }

    for (var i = 0; i < a.path().length; i++) {
      if (i === b.path().length) {
        return {
          type: ComparisonResultType.PREFIX,
          value: i
        };

      } else if (a.path()[i] !== b.path()[i]) {
        return { type: ComparisonResultType.DIFFERENT,  value: null };
      }
    }

    if (a.path().length == b.path().length) {
      return { type: ComparisonResultType.SAME,  value: null };
    }

    return { type: ComparisonResultType.SUFFIX,  value: null };
  }
}
