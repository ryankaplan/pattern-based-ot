/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/base/lang.ts' />
/// <reference path='../../../src/pbot/char/model.ts' />
/// <reference path='../ot_test_helpers.ts' />
/// <reference path='../../test.ts' />

module Char {
  describe('Execute text ops', () => {
    it('should work TODO(ryan)', () => {
      // Test executing text operations on a document
      let ops = [
        Char.Operation.Insert('a', 0),
        Char.Operation.Insert('b', 1),
        Char.Operation.Insert('c', 2),
        Char.Operation.Insert('x', 3),
        Char.Operation.Insert('y', 4),
        Char.Operation.Insert('z', 5),
        Char.Operation.Delete(0),
        Char.Operation.Delete(0),
        Char.Operation.Insert('q', 0)
      ];

      var empty:Array<string> = [];

      let model = new Char.Model('');
      for (var op of ops) {
        model.execute(op);
      }
      assertEqual(model.render(), 'qcxyz');

      let invalidOps = [
        Char.Operation.Insert('a', -1),
        Char.Operation.Insert('b', 10000),
        Char.Operation.Delete(-1),
        Char.Operation.Delete(10000),
      ];

      assertRaises(function () {
        (new Char.Model('a')).execute(Char.Operation.Insert('a', -1));
      }, 'Expect raise on insert at negative location');

      assertRaises(function () {
        (new Char.Model('abc')).execute(Char.Operation.Insert('a', 4));
      }, 'Expect raise on insert at too big loation');

      assertRaises(function () {
        (new Char.Model('a')).execute(Char.Operation.Delete(-1));
      }, 'Expect raise on delete at negative location');

      assertRaises(function () {
        (new Char.Model('a')).execute(Char.Operation.Delete(3));
      }, 'Expect raise on insert at too big location');
    });
  });
}

