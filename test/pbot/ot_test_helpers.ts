/// <reference path='../../src/pbot/char/model.ts' />

/// <reference path='../test.ts' />

function readableOp(op: Char.Operation): string {
  return (
    op.readableType() + ' at index ' + op.location() +

      // Add char line if there is a char
    (op.char() !== null ? ' with char ' + op.char() : '')
  );
}

function validateCP1(
    a: Char.Operation,
    b: Char.Operation,
    model: OperationBase.Model,
    eq: (a: OperationBase.Model, b: OperationBase.Model) => boolean
  ) {
  let ta = a.transform(b);
  let tb = b.transform(a);

  let modelAB = model.copy();
  modelAB.execute(a);
  modelAB.execute(tb);

  let modelBA = model.copy();
  modelBA.execute(b);
  modelBA.execute(ta);

  if (!eq(modelAB, modelBA)) {
    console.log('Begin failure dump\n\n\n');
    console.log('a: ' + JSON.stringify(a, null, 2));
    console.log('b: ' + JSON.stringify(b, null, 2));
    console.log('tA: ' + JSON.stringify(ta, null, 2));
    console.log('tB: ' + JSON.stringify(tb, null, 2));

    console.log('modelAB: ' + JSON.stringify(modelAB, null, 2));
    console.log('modelBA: ' + JSON.stringify(modelBA, null, 2));
    console.log('End failure dump\n\n\n');

    fail('CP1 validation failure!');
  }
}

