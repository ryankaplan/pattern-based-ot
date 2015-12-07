/// <reference path='../../test.ts' />
/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/pbot/grove/model.ts' />
/// <reference path='../../../src/pbot/grove/operation.ts' />


let GroveModel = Grove.Model;
let GroveOp = Grove.Operation;
let Address = Grove.Address;
let NodeType = Grove.NodeType;

describe('Grove Model', () => {

  describe('JSON', () => {
    it("Shouldn't crash", () => {

    });
  });

  function addChild(model: Grove.Model, path: Array<number>, tag: string, content: string) {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(GroveModel.ROOT_KEY, parentPath);
      var op = GroveOp.Insert(parentAddr, index, null, NodeType.TEXT);
      model.execute(op);

      let childAddr = new Address(GroveModel.ROOT_KEY, parentPath.concat([index]));

      for (var i = 0; i < tag.length; i++) {
        op = GroveOp.Update(childAddr, 'tag', Char.Operation.Insert(tag[i], i));
        model.execute(op);
      }

      for (var i = 0; i < content.length; i++) {
        op = GroveOp.Update(childAddr, 'content', Char.Operation.Insert(content[i], i));
        model.execute(op);
      }
  }

  function removeChild(model: Grove.Model, path: Array<number>): string {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);

      var parentAddr = new Address(GroveModel.ROOT_KEY, parentPath);
      let targetId = 'X';
      let op = GroveOp.Delete(parentAddr, index, targetId);
      model.execute(op);

      return targetId;
  }

  function updateChild(model: Grove.Model, path: Array<number>, newValue: string, key: string = 'content') {
      let index = path[path.length - 1];
      let parentPath = path.slice(0, path.length - 1);
      var op: Grove.Operation = null;
      let nodeAddr = new Address(GroveModel.ROOT_KEY, path);

      // Delete the current value
      let currentValue = model.nodeValueForKey(nodeAddr, key);
      for (var i = 0; i < currentValue.length; i++) {
        op = GroveOp.Update(nodeAddr, key, Char.Operation.Delete(0));
        model.execute(op);
      }

      for (var i = 0; i < newValue.length; i++) {
        op = GroveOp.Update(nodeAddr, key, Char.Operation.Insert(newValue[i], i));
        model.execute(op);
      }
  }

  describe('Model Tests', () => {
    it('Just a bunch of random junk as a sanity test', () => {
      let model = new GroveModel();

      // Adds

      addChild(model, [0], 'a', 'hello');
      assertEqual(model.render(), '<a>hello</a>', '');

      addChild(model, [1], 'b', 'bye');
      assertEqual(model.render(), '<a>hello</a><b>bye</b>', '');

      addChild(model, [0, 0], 'c', 'mornin');
      assertEqual(model.render(), '<a>hello<c>mornin</c></a><b>bye</b>', '');

      addChild(model, [0, 1], 'd', 'bloom');
      assertEqual(model.render(), '<a>hello<c>mornin</c><d>bloom</d></a><b>bye</b>', '');

      // Removes

      removeChild(model, [0]);
      assertEqual(model.render(), '<b>bye</b>', '');

      // Updates

      updateChild(model, [0], 'hello');
      assertEqual(model.render(), '<b>hello</b>', '');

      updateChild(model, [0], 'c', 'tag');
      assertEqual(model.render(), '<c>hello</c>', '');
    });
  });
});