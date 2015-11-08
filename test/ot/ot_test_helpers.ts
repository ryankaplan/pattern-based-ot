/// <reference path='../../src/ot/text.ts' />

/// <reference path='../test.ts' />

function validateCP1(a: TextOp, b: TextOp, text: string) {
  let ta = a.transform(b);
  let tb = b.transform(a);

  let modelAB = new TextOperationModel(text);
  modelAB.execute(a);
  modelAB.execute(tb);

  let modelBA = new TextOperationModel(text);
  modelBA.execute(b);
  modelBA.execute(ta);

  assertEqual(modelAB.render(), modelBA.render());
}

