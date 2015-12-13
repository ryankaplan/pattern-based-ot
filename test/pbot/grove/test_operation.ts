
/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/base/lang.ts' />
/// <reference path='../../../src/pbot/grove/model.ts' />
/// <reference path='../ot_test_helpers.ts' />
/// <reference path='../../test.ts' />

module Grove {

  interface SiteInfo {
    id: string;
    idGen: Base.NumberIdGenerator;
  }

  describe('Grove operations', () => {

    var site1: any = null;
    var site2: any = null;
    let targetIdGenerator = new Base.NumberIdGenerator();

    beforeEach(() => {
      // Test transforming ops against each other
      site1 = {
        id: '1',
        idGen: new Base.NumberIdGenerator()
      };
      site2 = {
        id: '2',
        idGen: new Base.NumberIdGenerator()
      };
    });

    function allInserts(model: Model, site: SiteInfo): Array<Operation> {
      let res: Array<Operation> = [];

      for (var addr of model.addressesInSubtree(new Address(Model.ROOT_ID, []))) {
        let node = model.nodeAtAddress(addr);
        for (var i = 0; i <= node.children().length; i++) {
          let newOp = Operation.Insert(addr, i, null, NodeType.TEXT);
          newOp.setTimestamp(new Timestamp(site.id, site.idGen.next(), -1));
          res.push(newOp);
        }
      }

      return res;
    }

    function allDeletes(model: Model, site: SiteInfo): Array<Operation> {
      let res: Array<Operation> = [];
      for (var addr of model.addressesInSubtree(new Address(Model.ROOT_ID, []))) {
        let node = model.nodeAtAddress(addr);
        for (var i = 0; i < node.children().length; i++) {
          let newOp = Operation.Delete(addr, i, '' + targetIdGenerator.next());
          newOp.setTimestamp(new Timestamp(site.id, site.idGen.next(), -1));
          res.push(newOp);
        }
      }
      return res;
    }


    describe('CP1 on every pair of Grove Ops on a small tree', () => {
      let models = [
        Model.fromJson([{
          id: Model.ROOT_ID,
          properties: { tag: 'a' },
        }]),

        Model.fromJson([{
          id: Model.ROOT_ID,
          properties: { tag: 'a' },
          children: [
            { properties: { tag: 'a', content: 'blah' } },
          ]
        }]),

        Model.fromJson([{
          id: Model.ROOT_ID,
          properties: { tag: 'a' },
          children: [
            { properties: { tag: 'a', content: 'blah' } },
            { properties: { tag: 'table' } },
          ]
        }]),

        Model.fromJson([{
          id: Model.ROOT_ID,
          properties: { tag: 'a' },
          children: [
            { properties: { tag: 'a', content: 'blah' } },
            { properties: { tag: 'table' } },
            { properties: { tag: 'img' } }
          ]
        }])
      ];

      let modelEq = (a: Model, b: Model) => {
        return a.rootsEqual(b);
      };

      it('shouldnt fail CP1 validation', () => {
        for (var model of models) {
          var pairs = Base.allPairs(allInserts(model, site1), allInserts(model, site2));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          var pairs = Base.allPairs(allInserts(model, site1), allDeletes(model, site2));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          var pairs = Base.allPairs(allDeletes(model, site1), allInserts(model, site2));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          var pairs = Base.allPairs(allDeletes(model, site1), allDeletes(model, site2));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }
        }
      });
    });
  });
}