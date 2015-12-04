module Grove {
  export class Address {
    constructor(
      public name: string,
      public path: Array<number>
    ) {}

    initWithJson(parsed: any): void {
      this.name = parsed['name'];
      this.path = parsed['path'].slice(0);
    }

    fillJson(json: any): void {
      json['name'] = this.name;
      json['path'] = this.path.slice(0);
    }

    copy(other: Address):void {
      this.name = other.name;
      this.path = other.path.slice(0);
    }
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
    if (a.name !== b.name) {
      return { type: ComparisonResultType.DIFFERENT,  value: null };
    }

    for (var i = 0; i < a.path.length; i++) {
      if (i === b.path.length) {
        return {
          type: ComparisonResultType.PREFIX,
          value: i
        };

      } else if (a.path[i] !== b.path[i]) {
        return { type: ComparisonResultType.DIFFERENT,  value: null };
      }
    }

    if (a.path.length == b.path.length) {
      return { type: ComparisonResultType.SAME,  value: null };
    }

    return { type: ComparisonResultType.SUFFIX,  value: null };
  }
}
