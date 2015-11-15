/// <reference path='../typings/mocha.d.ts' />

/// <reference path='../../src/base/lang.ts' />
/// <reference path='../../src/ot/text.ts' />

/// <reference path='ot_test_helpers.ts' />
/// <reference path='../test.ts' />

function processOps(ops:Array<TextOp>, initialChars:Array<string>) {
  let model = new TextOperationModel(initialChars.join());
  for (var op of ops) {
    model.execute(op);
  }
  return model.render();
}

function allInserts(document:string, char:string = 'x') {
  let res: Array<TextOp> = [];
  for (var i = 0; i < document.length + 1; i++) {
    res.push(TextOp.Insert(char, i));
  }
  return res;
}

function allDeletes(document:string) {
  let res: Array<TextOp> = [];
  for (var i = 0; i < document.length; i++) {
    res.push(TextOp.Delete(i));
  }
  return res;
}

function allPairs(arr1:Array<any>, arr2:Array<any>) {
  let res: Array<Array<TextOp>> = [];
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
      idGen: new IDGenerator()
    };
    site2 = {
      id: 2,
      idGen: new IDGenerator()
    };
  });

  describe('CP2 on every pair of Text Ops on documents of length less than 5', () => {
    it('Should not fail', () => {
      // TODO(ryan): three chars should be sufficient
      let bigString = 'vwxyz';
      for (var i = 1; i < bigString.length + 1; i++) {
        // Validate CP2 for every combination of pairs of operations on a document
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


  // TODO(ryan): All cases below this line should just test a specific case of the
  // test above. We should be able to get rid of them. Think carefully about this
  // and then do so.

  describe('Insert Insert', () => {
    it('should work TODO(ryan)', () => {
      // Test transform INSERT against INSERT
      let a = TextOp.Insert('a', 10);
      let b = TextOp.Insert('b', 0);
      validateCP1(a, b, '1xxxxxyyyyyzzzzz');

      let tA = a.transform(b);
      assertEqual(tA.location(), 11);

      let tB = b.transform(a);
      assertEqual(tB.location(), 0);

      // Test ops with the same location
      a = TextOp.Insert('a', 10);
      b = TextOp.Insert('b', 10);
      validateCP1(a, b, '2xxxxxyyyyyzzzzz');

      tA = a.transform(b);
      assertEqual(tA.location(), 10);

      tB = b.transform(a);
      assertEqual(tB.location(), 11);
    });
  });

  describe('Insert Delete', () => {
    it('should work TODO(ryan)', () => {
      {
        // Test transform INSERT against INSERT
        let a = TextOp.Insert('a', 10);
        let b = TextOp.Delete(0);
        validateCP1(a, b, '1xxxxxyyyyyzzzzz');

        let tA = a.transform(b);
        assertEqual(tA.location(), 9);

        let tB = b.transform(a);
        assertEqual(tB.location(), 0);
      }


      {
        // Test ops with the same location
        let a = TextOp.Insert('a', 10);
        let b = TextOp.Delete(10);
        validateCP1(a, b, '2xxxxxyyyyyzzzzz');

        let tA = a.transform(b);
        assertEqual(tA.location(), 10);

        let tB = b.transform(a);
        assertEqual(tB.location(), 11);
      }
    });
  });

  describe('Delete Insert', () => {
    it('should work TODO(ryan)', () => {
      {
        // Test transform INSERT against INSERT
        let a = TextOp.Delete(10);
        let b = TextOp.Insert('b', 0);
        validateCP1(a, b, '1xxxxxyyyyyzzzzz');

        let tA = a.transform(b);
        assertEqual(tA.location(), 11);

        let tB = b.transform(a);
        assertEqual(tB.location(), 0);
      }

      {
        // Test ops with the same location
        let a = TextOp.Delete(10);
        let b = TextOp.Insert('b', 10);
        validateCP1(a, b, '2xxxxxyyyyyzzzzz');

        let tA = a.transform(b);
        assertEqual(tA.location(), 11);

        let tB = b.transform(a);
        assertEqual(tB.location(), 10);
      }
    });
  });

  describe('Delete Delete', () => {
    it('should work TODO(ryan)', () => {
      // Test transform INSERT against INSERT
      let a = TextOp.Delete(10);
      let b = TextOp.Delete(0);
      validateCP1(a, b, '1xxxxxyyyyyzzzzz');

      let tA = a.transform(b);
      assertEqual(tA.location(), 9);

      let tB = b.transform(a);
      assertEqual(tB.location(), 0);

      // Test ops with the same location
      a = TextOp.Delete(10);
      b = TextOp.Delete(10);
      validateCP1(a, b, '2xxxxxyyyyyzzzzz');

      tA = a.transform(b);
      assertEqual(tA.location(), 9);

      tB = b.transform(a);
      assertEqual(tB.location(), 9);
    });
  });

  describe('Execute text ops', () => {
    it('should work TODO(ryan)', () => {
      // Test executing text operations on a document
      let ops = [
        TextOp.Insert('a', 0),
        TextOp.Insert('b', 1),
        TextOp.Insert('c', 2),
        TextOp.Insert('x', 3),
        TextOp.Insert('y', 4),
        TextOp.Insert('z', 5),
        TextOp.Delete(0),
        TextOp.Delete(0),
        TextOp.Insert('q', 0)
      ];

      var empty:Array<string> = [];
      assertEqual(processOps(ops, empty), 'qcxyz');

      let invalidOps = [
        TextOp.Insert('a', -1),
        TextOp.Insert('b', 10000),
        TextOp.Delete(-1),
        TextOp.Delete(10000),
      ];

      assertRaises(function () {
        (new TextOperationModel('a')).execute(TextOp.Insert('a', -1));
      }, 'Expect raise on insert at negative location');

      assertRaises(function () {
        (new TextOperationModel('abc')).execute(TextOp.Insert('a', 4));
      }, 'Expect raise on insert at too big loation');

      assertRaises(function () {
        (new TextOperationModel('a')).execute(TextOp.Delete(-1));
      }, 'Expect raise on delete at negative location');

      assertRaises(function () {
        (new TextOperationModel('a')).execute(TextOp.Delete(3));
      }, 'Expect raise on insert at too big location');
    });
  });
});