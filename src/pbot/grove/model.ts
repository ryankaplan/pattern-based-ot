/// <reference path='node.ts' />
/// <reference path='operation.ts' />
/// <reference path='../char/model.ts' />
/// <reference path='../../base/deque.ts' />

module Grove {
  export class Model implements OperationBase.Model {
    // TODO(ryan): somehow exclude this from possible generated node names
    static ROOT_ID: string = '__root__';

    constructor(
      private _roots: { [name: string]: Node } = {}
    ) {
      if (!(Model.ROOT_ID in this._roots)) {
        let node = new Node(Model.ROOT_ID);
        this._roots[node.id()] = node;
      }
    }

    static fromJson(json: Array<any>): Model {
      let roots: { [key: string]: Node } = {};
      for (var jsonNode of json) {
        let node = Node.fromJson(jsonNode);
        roots[node.id()] = node;
      }
      return new Model(roots);
    }

    public documentRootNode() {
      return this._roots[Model.ROOT_ID];
    }

    public copy(): Model {
      let roots: { [id: string]: Node } = {};
      for (var key in this._roots) {
        roots[key] = this._roots[key].copyWithChildren();
      }
      return new Model(roots);
    }

    // Checks if the root trees are equal
    public rootsEqual(other: Model): boolean {
      let valEquals = (a: Node, b: Node) => { return a.subtreeEquals(b); }
      return this._roots[Model.ROOT_ID].subtreeEquals(other._roots[Model.ROOT_ID]);
    }

    // Compares the models as ordered trees of property objects
    public equals(other: Model): boolean {
      let valEquals = (a: Node, b: Node) => { return a.subtreeEquals(b); }
      return Base.objEquals(this._roots, other._roots, valEquals);
    }

    public render(): string {
      var result: Array<string> = [];

      traverse(
        this._roots[Model.ROOT_ID],

        // pre
        (node: Node) => {
          let tag = node.modelForKey('tag').render();
          if (tag.length !== 0) {
            result.push('<' + tag + '>');
          }

          let content = node.modelForKey('content').render();
          if (content.length !== 0) {
            result.push(content);
          }
        },

        // post
        (node: Node) => {
          let tag = node.modelForKey('tag').render();
          if (tag.length !== 0) {
            result.push('</' + tag + '>');
          }
        }
      );

      return result.join('');
    }

    public nodeValueForKey(address: Address, key: string): string {
      let node = this.nodeAtAddress(address);
      if (node) {
        return node.modelForKey(key).render();
      }
      return null;
    }

    public nodeAtAddress(address: Address): Node {
      if (!(address.id() in this._roots)) {
        fail('Missing node with name ' + address.id() + ' in roots ' + JSON.stringify(this._roots));
      }
      var node = this._roots[address.id()];
      for (var index of address.path()) {
        if (node.children().length <= index) {
          fail('Index in path is not valid!');
        }
        node = node.childAtIndex(index);
      }
      return node;
    }

    public execute(op_: OperationBase.Operation): void {
      let op = <Operation>op_;

      if (op.isNoop()) {
        return;
      }

      let parentNode = this.nodeAtAddress(op.address());
      if (!parentNode) {
        fail('Missing parent node!');
      }

      if (op.isInsert()) {
        var node: Node = null;
        if (op.targetId() in this._roots) {
          node = this._roots[op.targetId()];
          // remove from roots since we'll be appending this node to some other subtree
          this._roots[op.targetId()] = null;
          // TODO(ryan): set node.name to null?
        } else {
          node = new Node(null);
        }
        parentNode.insertChildAtIndex(node, op.index());
      }

      else if (op.isDelete()) {
        let removed = parentNode.removeChildAtIndex(op.index());
        removed.setId(op.targetId());
        if (op.targetId() in this._roots) {
          fail("This shouldnt' happen!");
        }
        this._roots[op.targetId()] = removed;
      }

      else if (op.isUpdate()) {
        parentNode.modelForKey(op.key()).execute(op.textOp());
      }

      else {
        fail('Unrecognized OperationType + ', op.readableType());
      }
    }

    public addressesInSubtree(addr: Address): Array<Address> {
      let toProcess = new Deque<Address>([addr.copy()]);
      let res: Array<Address> = [];

      while (!toProcess.isEmpty()) {
        // pop the next node to process and append it to our output
        let parentAddr = toProcess.popFront();
        res.push(parentAddr);

        // Walk through the node's children. Add each of its addresses
        // and push it onto toProcess.
        let node = this.nodeAtAddress(parentAddr);
        for (var i = 0; i < node.children().length; i++) {
          let childAddr = parentAddr.copy();
          childAddr.setPath(childAddr.path().concat([i]));
          toProcess.pushBack(childAddr);
        }
      }
      return res;
    }

    // helpers that operate on nodes at a particular path

    public addChild(path: Array<number>, nodeValues: { [key: string]: string }) {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(Model.ROOT_ID, parentPath);
      var op = Operation.Insert(parentAddr, index, null, NodeType.TEXT);
      this.execute(op);

      let childAddr = new Address(Model.ROOT_ID, parentPath.concat([index]));

      for (var key in nodeValues) {
        let value = nodeValues[key];

        for (var i = 0; i < value.length; i++) {
          op = Operation.Update(childAddr, key, Char.Operation.Insert(value[i], i));
          this.execute(op);
        }
      }
    }

    public removeChild(path: Array<number>): string {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(Model.ROOT_ID, parentPath);

      var newId: string = null;
      while (true) {
        newId = Base.randomString(6, Base.ALPHA_NUMERIC);
        if (newId in this._roots) {
          continue;
        } else {
          break;
        }
      }

      let targetId = newId;
      let op = Operation.Delete(parentAddr, index, targetId);
      this.execute(op);

      return targetId;
    }

    public updateChild(path: Array<number>, nodeValues: { [key: string]: string }) {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);
      var op: Grove.Operation = null;
      let nodeAddr = new Address(Model.ROOT_ID, path);

      for (var key in nodeValues) {
        // Delete the current value
        let currentValue = this.nodeValueForKey(nodeAddr, key);
        for (var i = 0; i < currentValue.length; i++) {
          op = Operation.Update(nodeAddr, key, Char.Operation.Delete(0));
          this.execute(op);
        }

        let value = nodeValues[key];
        for (var i = 0; i < value.length; i++) {
          op = Operation.Update(nodeAddr, key, Char.Operation.Insert(value[i], i));
          this.execute(op);
        }
      }
    }
  }
}