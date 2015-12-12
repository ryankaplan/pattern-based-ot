/// <reference path='operation.ts' />
/// <reference path='../operation.ts' />
/// <reference path='../../base/list.ts' />
/// <reference path='../../base/logging.ts' />

module Char {
  export class Model implements OperationBase.Model {
    private _chars: Array<string>;

    constructor(text: string) {
      this._chars = text.split('');
    }

    public render(): string {
      return this._chars.join('');
    }

    public copy(): Model {
      return new Model(this._chars.join(''));
    }

    public equals(other: Model): boolean {
      return this.render() === other.render();
    }

    public execute(op_: OperationBase.Operation):void {
      let op = <Operation>op_;

      if (op.isNoop()) {
        return;
      }

      if (op.isInsert()) {
        if (op.location() < 0) {
          fail({
            message: 'Insert location is negative',
            operation: op,
            document: this.render()
          });
        }

        if (op.location() > this._chars.length) {
          fail({
            message: 'Insert location is too big',
            operation: op,
            document: this.render()
          });
        }

        this._chars.splice(op.location(), 0, op.char());
      }

      else if (op.isDelete()) {
        if (op.location() < 0) {
          fail({
            message: 'Delete location is negative',
            operation: op,
            document: this.render()
          });
        }

        if (op.location() > this._chars.length - 1) {
          fail({
            message: 'Delete location is too big',
            operation: op,
            document: this.render()
          });
        }

        this._chars.splice(op.location(), 1);
      } else {
        fail('Unhandled op type ' + op.type());
      }
    }
  }
}
