/// <reference path='../../typings/mocha.d.ts' />

/// <reference path='../../../src/base/lang.ts' />
/// <reference path='../../../src/pbot/char/model.ts' />

/// <reference path='../ot_test_helpers.ts' />
/// <reference path='../../test.ts' />

module TextTests {
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

  function allPairs(arr1:Array<any>, arr2:Array<any>) {
    let res: Array<Array<Char.Operation>> = [];
    for (var first of arr1) {
      for (var second of arr2) {
        res.push([first, second]);
      }
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
        idGen: new Base.IDGenerator()
      };
      site2 = {
        id: 2,
        idGen: new Base.IDGenerator()
      };
    });

    describe('CP1 on every pair of Text Ops on documents of length less than 5', () => {
      it('Should not fail', () => {
        // TODO(ryan): three chars should be sufficient
        let bigString = 'vwxyz';
        for (var i = 1; i < bigString.length + 1; i++) {
          // Validate CP1 for every combination of pairs of operations on a document
          // of length i.
          let doc = bigString.substr(0, i);
          var pairs = allPairs(allInserts(doc, 'a'), allInserts(doc, 'b'));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, doc);
          }

          pairs = allPairs(allInserts(doc, 'a'), allDeletes(doc));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, doc);
          }

          pairs = allPairs(allDeletes(doc), allInserts(doc, 'a'));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, doc);
          }

          pairs = allPairs(allDeletes(doc), allDeletes(doc));
          for (var [op1, op2] of pairs) {
            validateCP1(op1, op2, doc);
          }
        }
      });
    });
  });
}