/// <reference path='../../src/base/lang.ts' />
/// <reference path='../../src/ot/text.ts' />

/// <reference path='ot_test_helpers.ts' />
/// <reference path='../test.ts' />

function processOps(ops: Array<TextOp>, initialChars: Array<string>) {
  let model = new TextOperationModel(initialChars.join());
  for (var op of ops) {
    model.execute(op);
  }
  return model.render();
}

class TestTextOperations extends TestSuite {
  private _site1: any;
  private _site2: any;

  constructor() {
    super();

    this.tests = [
      this.testExecuteTextOps.bind(this),
      this.testInsertInsert.bind(this),
      this.testInsertDelete.bind(this),
      this.testDeleteInsert.bind(this),
      this.testDeleteDelete.bind(this)
    ];
  }

  setup() {
    // Test transforming ops against each other
    this._site1 = {
      id: 1,
      idGen: new IDGenerator()
    };

    this._site2 = {
      id: 2,
      idGen: new IDGenerator()
    };
  }

  // TODO(ryan): These tests need work. They were just thrown together
  // quickly.

  testInsertInsert() {
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
  }

  testInsertDelete() {
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
  }

  testDeleteInsert() {
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
  }

  testDeleteDelete() {
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
    assertEqual(tA.location(), 10);

    tB = b.transform(a);
    assertEqual(tB.location(), 10);
  }

  testExecuteTextOps() {
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

    var empty: Array<string> = [];
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
  }
}

(new TestTextOperations).runTests();
