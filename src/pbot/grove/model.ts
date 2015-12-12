/// <reference path='operation.ts' />
/// <reference path='../char/model.ts' />

module Grove {
  function traverse(node: Node, pre: (node: Node) => void, post: (node: Node) => void): void {
    if (pre) {
      pre(node);
    }

    for (var child of node.children()) {
      traverse(child, pre, post);
    }

    if (post) {
      post(node);
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////

  export enum NodeType {
    GROUP,
    TEXT
  }

  export class Node {
    private _children: Array<Node> = [];
    private _type: NodeType = NodeType.TEXT;

    // Start out with empty text
    private _propertyByKey: { [key: string]: Char.Model } = {};

    constructor(private _id: string = null) {}

    static fromJson(json: any): Node {
      let id = ('id' in json ? json['id'] : null);
      let children = ('children' in json ? json['children'] : []);
      let properties = ('properties' in json ? json['properties'] : {});

      let node = new Node(id);
      for (var childJson of children) {
        node.addChild(Node.fromJson(childJson));
      }

      for (var key in properties) {
        assert(typeof properties[key] == 'string');
        node._propertyByKey[key] = new Char.Model(properties[key]);
      }

      return node;
    }

    setId(id: string) { this._id = id; }
    id(): string { return this._id; }

    equalProperties(other: Node): boolean {
      let valEquals = (a: Char.Model, b: Char.Model) => {
        return a.equals(b);
      }
      return Base.objEquals(this._propertyByKey, other._propertyByKey, valEquals);
    }

    subtreeEquals(other: Node): boolean {
      if (!this.equalProperties(other)) {
        return false;
      }

      if (this._children.length !== other._children.length) {
        return false;
      }

      for (var i = 0; i < this._children.length; i++) {
        if (!this._children[i].equalProperties(other._children[i])) {
          return false;
        }
      }

      return true;
    }

    children() { return this._children; }
    insertChildAtIndex(node: Node, index: number) { insertAtIndex(this._children, node, index); }
    removeChildAtIndex(index: number): Node { return removeAtIndex(this._children, index); }
    childAtIndex(index: number): Node { return this._children[index]; }
    addChild(node: Node) { addElementIfMissing(this._children, node); }
    removeChild(node: Node) { removeElement(this._children, node); }

    modelForKey(key: string): Char.Model {
      if (!(key in this._propertyByKey)) {
        this._propertyByKey[key] = new Char.Model('');
      }
      return this._propertyByKey[key];
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////

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

    private nodeAtAddress(address: Address): Node {
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

      let nodeAtAddr = this.nodeAtAddress(op.address());
      if (!nodeAtAddr) {
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
        nodeAtAddr.insertChildAtIndex(node, op.index());
      }

      else if (op.isDelete()) {
        let removed = nodeAtAddr.removeChildAtIndex(op.index());
        removed.setId(op.targetId());
        if (op.targetId() in this._roots) {
          fail("This shouldnt' happen!");
        }
        this._roots[op.targetId()] = removed;
      }

      else if (op.isUpdate()) {
        nodeAtAddr.modelForKey(op.key()).execute(op.textOp());
      }

      else {
        fail('Unrecognized GroveOpType + ', op.readableType());
      }
    }

    // helpers that operate on nodes at a particular path

    public addChild(path: Array<number>, nodeValues: { [key: string]: string }) {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(GroveModel.ROOT_ID, parentPath);
      var op = GroveOp.Insert(parentAddr, index, null, NodeType.TEXT);
      this.execute(op);

      let childAddr = new Address(GroveModel.ROOT_ID, parentPath.concat([index]));

      for (var key in nodeValues) {
        let value = nodeValues[key];

        for (var i = 0; i < value.length; i++) {
          op = GroveOp.Update(childAddr, key, Char.Operation.Insert(value[i], i));
          this.execute(op);
        }
      }
    }

    public removeChild(path: Array<number>): string {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(GroveModel.ROOT_ID, parentPath);

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
      let op = GroveOp.Delete(parentAddr, index, targetId);
      this.execute(op);

      return targetId;
    }

    public updateChild(path: Array<number>, nodeValues: { [key: string]: string }) {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);
      var op: Grove.Operation = null;
      let nodeAddr = new Address(GroveModel.ROOT_ID, path);

      for (var key in nodeValues) {
        // Delete the current value
        let currentValue = this.nodeValueForKey(nodeAddr, key);
        for (var i = 0; i < currentValue.length; i++) {
          op = GroveOp.Update(nodeAddr, key, Char.Operation.Delete(0));
          this.execute(op);
        }

        let value = nodeValues[key];
        for (var i = 0; i < value.length; i++) {
          op = GroveOp.Update(nodeAddr, key, Char.Operation.Insert(value[i], i));
          this.execute(op);
        }
      }
    }
  }
}