/// <reference path='../../src/ot/text.ts' />

/// <reference path='../test.ts' />

function readableOp(op: TextOp): string {
  return (
    op.readableType() + ' at index ' + op.location() +

      // Add char line if there is a char
    (op.char() !== null ? ' with char ' + op.char() : '')
  );
}

function validateCP1(a: TextOp, b: TextOp, text: string) {
  let DEBUG = false;
  if (DEBUG) {
    console.log('About to validate CP1 on the following doc: \'' + text + '\'');
    console.log('a: ' + readableOp(a));
    console.log('b: ' + readableOp(b));
  }

  let ta = a.transform(b);
  let tb = b.transform(a);

  if (DEBUG) {
    console.log('a transform is ' + readableOp(ta));
    console.log('b transform is ' + readableOp(tb));
  }

  let modelAB = new TextOperationModel(text);
  modelAB.execute(a);
  modelAB.execute(tb);

  let modelBA = new TextOperationModel(text);
  modelBA.execute(b);
  modelBA.execute(ta);

  assertEqual(modelAB.render(), modelBA.render());

  if (DEBUG) {
    console.log('Validated CP1: ' + modelAB.render() + ' ' + modelBA.render());
  }
}

