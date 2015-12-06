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
    private _modelByKey: { [key: string]: Char.Model } = {};

    constructor(private _name: string = null) {}

    setName(name: string) { this._name = name; }
    name(): string { return this._name; }

    children() { return this._children; }
    insertChildAtIndex(node: Node, index: number) { insertAtIndex(this._children, node, index); }
    removeChildAtIndex(index: number): Node { return removeAtIndex(this._children, index); }
    childAtIndex(index: number): Node { return this._children[index]; }
    addChild(node: Node) { addElementIfMissing(this._children, node); }
    removeChild(node: Node) { removeElement(this._children, node); }

    modelForKey(key: string): Char.Model {
      if (!(key in this._modelByKey)) {
        this._modelByKey[key] = new Char.Model('');
      }
      return this._modelByKey[key];
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////

  export class Model implements OperationBase.Model {
    // TODO(ryan): somehow exclude this from possible generated node names
    static ROOT_KEY: string = '__ROOT__';

    constructor(
      private _roots: { [name: string]: Node } = {}
    ) {
      let node = new Node(Model.ROOT_KEY);
      this._roots[node.name()] = node;
    }

    public documentRootNode() {
      return this._roots[Model.ROOT_KEY];
    }

    public render(): string {
      var result: Array<string> = [];
      for (var name in this._roots) {

        traverse(
          this._roots[name],

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
      }
      return result.join('');
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
        removed.setName(op.targetId());
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
  }
}