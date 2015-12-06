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

  function addChild(model: Grove.Model, parentPath: Array<number>, index: number, tag: string, content: string) {
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

  describe('Model Tests', () => {
    it('hmmm', () => {
      let model = new GroveModel();

      addChild(model, [], 0, 'a', 'hello');
      assertEqual(model.render(), '<a>hello</a>', '');

      addChild(model, [], 1, 'b', 'bye');
      assertEqual(model.render(), '<a>hello</a><b>bye</b>', '');

      addChild(model, [0], 0, 'c', 'mornin');
      assertEqual(model.render(), '<a>hello<c>mornin</c></a><b>bye</b>', '');
    });
  });
});