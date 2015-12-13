/// <reference path='operation.ts' />
/// <reference path='../char/model.ts' />

module Grove {
	export function traverse(node: Node, pre: (node: Node) => void, post: (node: Node) => void): void {
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

    constructor(private _id: string = null) { }

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

    shallowCopy(): Node {
      let copy = new Node(this._id);
      copy._type = this._type;
      copy._propertyByKey = {};
      for (var key in this._propertyByKey) {
        copy._propertyByKey[key] = this._propertyByKey[key].copy();
      }
      return copy;
    }

    copyWithChildren(): Node {
      let thisCopy = this.shallowCopy();
      for (var child of this._children) {
        thisCopy.addChild(child.copyWithChildren());
      }
      return thisCopy;
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
}