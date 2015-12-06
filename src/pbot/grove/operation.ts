/// <reference path='address.ts' />
/// <reference path='../operation.ts' />
/// <reference path='../../base/list.ts' />
/// <reference path='../../base/logging.ts' />
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

    copy(other: Operation): void {
      // props for INSERT and DELETE
      this._type = other._type;
      this._address = other.address().copy();
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

    setType(type: GroveOpType) { this._type = type; }
    setIndex(index: number) { this._index = index; }
    setTextOp(textOp: TextOp) { this._textOp = textOp; }
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
        return this.transformInsertInsert(other);
      }

      else if (this.isInsert() && other.isDelete()) {
        return this.transformInsertDelete(other);
      }

      else if (this.isInsert() && other.isUpdate()) {
        return this.transformInsertUpdate(other);
      }

      else if (this.isDelete() && other.isInsert()) {
        return this.transformDeleteInsert(other);
      }

      else if (this.isDelete() && other.isDelete()) {
        return this.transformDeleteDelete(other);
      }

      else if (this.isDelete() && other.isUpdate()) {
        return this.transformDeleteUpdate(other);
      }

      else if (this.isUpdate() && other.isInsert()) {
        return this.transformUpdateInsert(other);
      }

      else if (this.isUpdate() && other.isDelete()) {
        return this.transformUpdateDelete(other);
      }

      else if (this.isUpdate() && other.isUpdate()) {
        return this.transformUpdateUpdate(other);
      }

      fail('Unrecognized node types ' + this.readableType() + ' and ' + other.readableType());
      return null;
    }

    // The logic of these functions is from page 65 of the paper
    // 'Generalizing Operational Transformation to the Standard
    // General Markup Language' by Davis, Sun, Lu.
    //
    // I've changed the variable names to make more sense in
    // context.
    //
    // TODO(ryan): Need to copy nodes in the functions below or their
    // timestamps don't get copied.

    ////////////////////////////////////////////////////////////////////////////////////

    // INSERT TRANSFORMS

    ////////////////////////////////////////////////////////////////////////////////////

    transformInsertInsert(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      let addr = this.address().copy();
      let index = this.index();

      if (this.address().id() === other.targetId()) {
        addr = new Address(
          other.address().id(),
          other.address().path().concat([other.index()]).concat(this.address().path())
        );
      }

      else if (cmp.type === ComparisonResultType.PREFIX) {
        // inserting a sibling before addr[cmp.value]. Use siteId
        // to break ties.
        if (
          other.index() < addr.path()[cmp.value] ||
          (other.index() === addr.path()[cmp.value] && this.timestamp().siteId() < other.timestamp().siteId())
        ) {
          addr.path()[cmp.value] = addr.path()[cmp.value] + 1;
        }
      }

      else if (cmp.type === ComparisonResultType.SAME) {
        // inserting a sibling at addr[cmp.value]. Use siteId
        // to break ties.
        if (
          other.index() < this.index() ||
          (other.index() === this.index() && this.timestamp().siteId() < other.timestamp().siteId())
        ) {
          index += 1;
        }
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      copy.setIndex(index);
      return copy;
    }

    transformInsertDelete(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      let addr = this.address().copy();
      let index = this.index();

      if (cmp.type === ComparisonResultType.SAME) {
        if (other.index() < this.index()) {
          // other removes a sibling before the place where this
          // would insert
          index -= 1;
        }
      }

      else if (cmp.type === ComparisonResultType.PREFIX) {
        if (other.index() < addr.path()[cmp.value]) {
          // other removes a sibling of addr[cmp.value]
          addr.path()[cmp.value] = addr.path()[cmp.value] - 1;
        }

        else if (other.index() === addr.path()[cmp.value]) {
          // other deletes an ancestor of the place where this
          // op applies. So this op now applies to the truncated
          // subtree that comes from applying other.
          addr = new Address(
            other.targetId(),
            addr.path().slice(cmp.value + 1)
          );
        }
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      copy.setIndex(index);
      return copy;
    }

    transformInsertUpdate(other: Operation): Operation {
      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      return copy;
    }


    ////////////////////////////////////////////////////////////////////////////////////

    // DELETE TRANSFORMS

    ////////////////////////////////////////////////////////////////////////////////////


    transformDeleteInsert(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      var addr = this.address().copy();
      let index = this.index();

      if (cmp.type === ComparisonResultType.PREFIX) {
        if (
          other.index() < addr.path()[cmp.value] ||
          (other.index() === addr.path()[cmp.value] && this.timestamp().siteId() < other.timestamp().siteId())
        ) {
          // insert is putting a new sibling before addr[cmp.value]
          addr.path()[cmp.value] = addr.path()[cmp.value] + 1;
        }
      }

      else if (cmp.type === ComparisonResultType.SAME) {
        // insert puts a new sibling before the node this
        // acts on
        if (other.index() < this.index()) {
          index += 1;
        }
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      copy.setIndex(index);
      return copy;
    }

    transformDeleteDelete(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      var addr = this.address().copy();
      let index = this.index();
      let type = this.type();

      if (cmp.type === ComparisonResultType.SAME) {
        if (other.index() < this.index()) {
          // other deletes a sibling before the node that
          // this acts on
          index -= 1;
        }

        else if (other.index() === this.index() && this.timestamp().siteId() === other.timestamp().siteId()) {
          // Both ops delete the same node
          // TODO(ryan): the siteId check in this conditional doesn't make sense to
          // me, but it's in the paper. This might fail the CP2 validation. I'll
          // find out when I write tests.
          type = GroveOpType.NOOP;
        }
      }

      else if (cmp.type === ComparisonResultType.PREFIX) {
        if (other.index() < addr.path()[cmp.value]) {
          // other deletes a sibling before addr.path()[cmp.value]
          addr.path()[cmp.value] = addr.path()[cmp.value] - 1;
        }

        else if (other.index() === addr.path()[cmp.value]) {
          // other deletes the node at addr.path()[cmp.value]
          addr = new Address(other.targetId(), addr.path().slice(cmp.value + 1));
        }
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      copy.setIndex(index);
      copy.setType(type);
      return copy;
    }

    transformDeleteUpdate(other: Operation): Operation {
      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      return copy;
    }

    ////////////////////////////////////////////////////////////////////////////////////

    // UPDATE TRANSFORMS

    ////////////////////////////////////////////////////////////////////////////////////

    transformUpdateInsert(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      var addr = this.address().copy();

      if (addr.id() === other.targetId()) {
        // other takes node with id other.targetId() and moves
        // it into the main tree. We need to update the address
        // of this to point to the main tree.
        addr = new Address(
          other.address().id(),
          other.address().path().concat([other.index()]).concat(this.address().path())
        );
      }

      else if (
        cmp.type === ComparisonResultType.PREFIX &&
        other.index() <= this.address().path()[cmp.value]
      ) {
        // other inserts a sibling before this.address().path()[cmp.value]
        // to its index in its parent's children list must be incremented
        addr.path()[cmp.value] = addr.path()[cmp.value] + 1;
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      return copy;
    }

    transformUpdateDelete(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      var addr = this.address().copy();

      if (cmp.type === ComparisonResultType.PREFIX) {
        // other deletes a sibling after this.address([cmp.value])

        if (other.index() < this.address().path()[cmp.value]) {
          // a sibling before addr.path()[cmp.value] was removed
          addr.path()[cmp.value] = addr.path()[cmp.value] - 1
        }

        else if (other.index() === this.address().path()[cmp.value]) {
          // other removes the subtree that this op applies to. So
          // our address now points to the removed ops new id and
          // the path is shortened to the remaining part of it.
          addr = new Address(
            other.targetId(),
            this.address().path().slice(cmp.value + 1)
          );
        }
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setAddress(addr);
      return copy;
    }

    transformUpdateUpdate(other: Operation): Operation {
      let cmp = compare(this.address(), other.address());

      let textOp = this.textOp();
      if (cmp.type === ComparisonResultType.SAME && this.key() === other.key()) {
        textOp = this.textOp().transform(other.textOp());
      }

      let copy = new Operation(null, null, null, null, null, null, null);
      copy.copy(this);
      copy.setTextOp(textOp);
      return copy;
    }
  }
}