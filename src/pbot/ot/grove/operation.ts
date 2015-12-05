/// <reference path='address.ts' />
/// <reference path='../operation.ts' />
/// <reference path='../../../base/list.ts' />
/// <reference path='../../../base/logging.ts' />
/// <reference path='../text_op.ts' />

module Grove {
  export enum GroveOpType {
    NOOP,
    INSERT,
    DELETE,
    UPDATE
  }

  export class Operation extends OperationBase.Operation {
    constructor(
      private _type: GroveOpType,

      // props for INSERT and DELETE
      private _address: Address, // N in the paper
      private _index: number, // n in the paper
      private _targetId: string, // M in the paper

      // props for INSERT
      private _nodeType: NodeType, // T in the paper

      // props for UPDATE
      private _key: string, // k in the paper
      private _textOp: TextOp // f in the paper
    ) {
      super()
    }

    static Noop() {
      return new GroveOp(GroveOpType.NOOP, null, null, null, null, null, null);
    }

    static Insert(address: Address, index: number, targetId: string, type: NodeType) {
      return new GroveOp(GroveOpType.INSERT, address, index, targetId, type, null, null);
    }

    static Delete(address: Address, index: number, targetId: string) {
      return new GroveOp(GroveOpType.DELETE, address, index, targetId, null, null, null);
    }

    static Update(address: Address, key: string, f: TextOp) {
      return new GroveOp(GroveOpType.UPDATE, address, null, null, null, key, f);
    }

    initWithJson(parsed: any): void {
      this._type = parsed['type'];

      // props for INSERT and DELETE
      this._address = new Address(null, null);
      this._address.initWithJson(parsed['address']);
      this._index = parsed['index'];
      this._targetId = parsed['targetId'];

      // props for INSERT
      this._nodeType = parsed['nodeType'];

      // props for UPDATE
      this._key = parsed['key'];
      this._textOp = TextOp.Noop();
      this._textOp.initWithJson(parsed['textOp']);

      // super
      super.initWithJson(parsed);
    }

    fillJson(json: any): void {
      json['type'] = this._type;

      // props for INSERT and DELETE
      json['address'] = {};
      this._address.fillJson(json['address']);
      json['index'] = this._index;
      json['targetId'] = this._targetId;

      // props for INSERT
      json['nodeType'] = this._nodeType;

      // props for UPDATE
      json['key'] = this._key;
      json['textOp'] = {};
      this._textOp.fillJson(json['textOp']);

      // super
      super.fillJson(json);
    }

    copy(other: Operation):void {
      // props for INSERT and DELETE
      this._type = other._type;
      this._address = new Address(null, null);
      this._address.copy(other._address);
      this._index = other._index;
      this._targetId = other._targetId;

      // props for INSERT
      this._nodeType = other._nodeType;

      // props for UPDATE
      this._key = other._key;
      this._textOp = TextOp.Noop();
      this._textOp.copy(other._textOp);

      super.copy(other);
    }

    //////////////////////////////////////////////////////////////////

    readableType(): string {
      switch (this._type) {
        case GroveOpType.INSERT: return 'INSERT';
        case GroveOpType.DELETE: return 'DELETE';
        case GroveOpType.NOOP: return 'NOOP';
        case GroveOpType.UPDATE: return 'UPDATE';
      }
    }

    setAddress(address: Address) { this._address = address; }

    type(): GroveOpType { return this._type; }
    address(): Address { return this._address; }
    index(): number { return this._index; }
    targetId(): string { return this._targetId; }
    nodeType(): NodeType { return this._nodeType; }
    key(): string { return this._key; }
    textOp(): TextOp { return this._textOp; }

    isDelete(): boolean { return this._type === GroveOpType.DELETE; }
    isInsert(): boolean { return this._type === GroveOpType.INSERT; }
    isUpdate(): boolean { return this._type === GroveOpType.UPDATE; }
    isNoop(): boolean { return this._type === GroveOpType.NOOP; }

    // Transform works for two operations a and b such that
    //
    // tA = a.transform(b)
    // tB = b.transform(a)
    //
    // and applying a and then tB to a document has the same result
    // as a applying b and then tA.

    transform(other_: OperationBase.Operation): Operation {
      let other = <Operation>other_;
      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);

      if (this.isNoop() || other.isNoop()) {
        return copy;
      }

      if (this.isInsert() && other.isInsert()) {
        this.transformInsertInsert(copy, other);
      }

      else if (this.isInsert() && other.isDelete()) {
        this.transformInsertDelete(copy, other);
      }

      else if (this.isInsert() && other.isUpdate()) {
        this.transformInsertUpdate(copy, other);
      }

      else if (this.isDelete() && other.isInsert()) {
        this.transformDeleteInsert(copy, other);
      }

      else if (this.isDelete() && other.isDelete()) {
        this.transformDeleteDelete(copy, other);
      }

      else if (this.isDelete() && other.isUpdate()) {
        this.transformDeleteUpdate(copy, other);
      }

      else if (this.isUpdate() && other.isInsert()) {
        this.transformUpdateInsert(copy, other);
      }

      else if (this.isUpdate() && other.isDelete()) {
        this.transformUpdateDelete(copy, other);
      }

      else if (this.isUpdate() && other.isUpdate()) {
        this.transformUpdateUpdate(copy, other);
      }

      else {
        fail('Unrecognized node types ' + this.readableType() + ' and ' + other.readableType());
      }

      return copy;
    }

    transformInsertInsert(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformInsertDelete(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformInsertUpdate(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformDeleteInsert(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformDeleteDelete(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformDeleteUpdate(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformUpdateInsert(a: Operation, b: Operation) {
      // TODO(ryan)
      /*
      let cmp = compare(a.address(), b.address());

      if (a.address().id() === b.targetId()) {
        let newId = b.address().id();
        let newPath = b.address().path() + [b.index()] + a.address().path();

        a.setAddress(new Address(newId, newPath));
      }

      else if (cmp.type == ComparisonResultType.PREFIX && b.index() <= a.address().path()[cmp.value]) {

      }

      return new Operation.Update(a.address(), a.key(), a.textOp());
      */
    }

    transformUpdateDelete(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

    transformUpdateUpdate(copy: Operation, other: Operation) {
      // TODO(ryan)
    }

  }
}