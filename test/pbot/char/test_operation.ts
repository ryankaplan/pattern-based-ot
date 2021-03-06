/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/base/lang.ts' />
/// <reference path='../../../src/pbot/char/model.ts' />
/// <reference path='../ot_test_helpers.ts' />
/// <reference path='../../test.ts' />

module Char {
  function allInserts(document:string, char:string = 'x') {
    let res: Array<Char.Operation> = [];
    for (var i = 0; i < document.length + 1; i++) {
      res.push(Char.Operation.Insert(char, i));
    }
    return res;
  }

  function allDeletes(document:string) {
    let res: Array<Char.Operation> = [];
    for (var i = 0; i < document.length; i++) {
      res.push(Char.Operation.Delete(i));
    }
    return res;
  }

  describe('Text operations', () => {

    var site1:any = null;
    var site2:any = null;

    beforeEach(() => {
      // Test transforming ops against each other
      site1 = {
        id: 1,
        idGen: new Base.NumberIdGenerator()
      };
      site2 = {
        id: 2,
        idGen: new Base.NumberIdGenerator()
      };
    });

    describe('CP1 on every pair of Text Ops on documents of length less than 5', () => {
      it('Should not fail', () => {
        // TODO(ryan): three chars should be sufficient
        let bigString = 'vwxyz';
        let modelEq = (a: Model, b: Model) => { return a.equals(b); };
        for (var i = 1; i < bigString.length + 1; i++) {
          // Validate CP1 for every combination of pairs of operations on a document
          // of length i.
          let model = new Char.Model(bigString.substr(0, i));
          let doc = bigString.substr(0, i);
          var pairs = Base.allPairs(allInserts(doc, 'a'), allInserts(doc, 'b'));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          pairs = Base.allPairs(allInserts(doc, 'a'), allDeletes(doc));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          pairs = Base.allPairs(allDeletes(doc), allInserts(doc, 'a'));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }

          pairs = Base.allPairs(allDeletes(doc), allDeletes(doc));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, model, modelEq);
          }
        }
      });
    });
  });
}