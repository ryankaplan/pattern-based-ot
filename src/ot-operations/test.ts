/// <reference path='../base/lang.ts' />
/// <reference path='text.ts' />

import TextOp = TextOperation.Operation;

class IdGenerator {
  private _opNumber: number = 0;
  constructor(private _siteId: number) {} 
  
  next(): string {
    let newId = OpId.create(this._siteId, this._opNumber);
    this._opNumber += 1;
    return newId;
  }
}

function processOps(ops: Array<TextOp>, model: Array<string>) {
  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
    op.execute(model);
  }
  return model.join('');
}

function assertEqual(a: any, b: any) {
  if (a != b) {
    console.log("First value: ", a);
    console.log("Second value:", b);
    throw 'TEST FAILURE: Values are not equal';
  }
}

function assertRaises(func: any, message: string = '') {
  var didRaise = false;
  try {
    func();
  } catch (e) {
    didRaise = true;
  }
  
  if (!didRaise)  {
    console.log('Message: ' + message);
    throw "TEST FAILURE: No exception thrown";
  }
}

function runTests() {
  let sid1 = new IdGenerator(0);
  let sid2 = new IdGenerator(1);

  let ops = [
    TextOp.Insert(sid1.next(), 'a', 0),
    TextOp.Insert(sid1.next(), 'b', 1),
    TextOp.Insert(sid1.next(), 'c', 2),
    TextOp.Insert(sid1.next(), 'x', 3),
    TextOp.Insert(sid1.next(), 'y', 4),
    TextOp.Insert(sid1.next(), 'z', 5),
    TextOp.Delete(sid1.next(), 0),
    TextOp.Delete(sid1.next(), 0),
    TextOp.Insert(sid1.next(), 'q', 0)
  ];

  var empty: Array<string> = [];
  assertEqual(processOps(ops, empty), 'qcxyz');
  
  let invalidOps = [
    TextOp.Insert(sid1.next(), 'a', -1),
    TextOp.Insert(sid1.next(), 'b', 10000),
    TextOp.Delete(sid1.next(), -1),
    TextOp.Delete(sid1.next(), 10000),
  ];
  
  assertRaises(function () {
    TextOp.Insert(sid1.next(), 'a', -1).execute(['a']);
  }, 'Expect raise on insert at negative location');
  
  assertRaises(function () {
    TextOp.Insert(sid1.next(), 'a', 4).execute(['a', 'b', 'c']);
  }, 'Expect raise on insert at too big loation');
  
  assertRaises(function () {
    TextOp.Delete(sid1.next(), -1).execute(['a']);
  }, 'Expect raise on delete at negative location');
  
  assertRaises(function () {
    TextOp.Delete(sid1.next(), 3).execute(['a', 'b', 'c']);
  }, 'Expect raise on insert at too big location');
  
  var nextId = sid1.next();
  assertRaises(function () {
    TextOp.Insert(nextId, 'a', 0).transform(TextOp.Insert(nextId, 'b', 9));
  }, 'Can\'t transform an op against one with the same id');
  
  console.log('SUCCESS. ALL TESTS PASS.');
}

runTests();