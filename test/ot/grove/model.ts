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

  describe('Compare', () => {
    it('Should return the same results as the paper', () => {
      let model = new GroveModel();

      // Create a single child text node
      var parentAddr = new Address(GroveModel.ROOT_KEY, []);
      let op1 = GroveOp.Insert(parentAddr, 0, null, NodeType.TEXT);
      model.execute(op1);

      parentAddr = new Address(GroveModel.ROOT_KEY, [0]);
      let op2 = GroveOp.Update(parentAddr, 'content', TextOp.Insert('A', 0));
      model.execute(op2);

      assertEqual(model.render(), 'A', 'Just a single character added');
    });
  });
});