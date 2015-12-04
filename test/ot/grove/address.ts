/// <reference path='../../test.ts' />
/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/pbot/ot/grove/address.ts' />

describe('Grove Address', () => {

  describe('JSON', () => {
    it("Shouldn't crash", () => {
      let addr = new Grove.Address('A', [1, 2, 3, 4]);
      let addrJson = {};
      addr.fillJson(addrJson);

      let addr2 = new Grove.Address(null, null);
      addr2.initWithJson(addrJson);

      assertEqual(addr.name, addr2.name, 'Names should be equal');
      assertEqual(addr.path.length, addr2.path.length, 'Path lengths should be equal');

      for (var i = 0; i < addr.path.length; i++) {
        if (addr.path[i] !== addr2.path[i]) {
          fail('items at index ' + i + ' in path are not equal ' + JSON.stringify(addr) + ' ' + JSON.stringify(addr2));
        }
      }
    });
  });

  describe('Compare', () => {

    // These are from page 62 of the paper
    it('Should return the same results as the paper', () => {
      var a: Grove.Address = null;
      var b: Grove.Address = null;

      a = new Grove.Address('A', [0, 1, 0]);
      b = new Grove.Address('B', [0, 1]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.DIFFERENT, 'Should be DIFFERENT');

      a = new Grove.Address('A', [0, 1, 1]);
      b = new Grove.Address('B', [0, 0]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.DIFFERENT, 'Should be DIFFERENT');

      a = new Grove.Address('A', [0, 1, 1, 0, 1]);
      b = new Grove.Address('A', [0, 1, 1]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.PREFIX, 'Should be PREFIX');
      assertEqual(Grove.compare(a, b).value, 3, 'Should be 3');

      a = new Grove.Address('B', []);
      b = new Grove.Address('B', [0, 0, 0]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.SUFFIX, 'Should be SUFFIX');

      a = new Grove.Address('B', []);
      b = new Grove.Address('B', [0, 0, 1, 0]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.SUFFIX, 'Should be SUFFIX');

      a = new Grove.Address('B', [0, 0, 0]);
      b = new Grove.Address('B', [0, 0, 1, 0]);
      assertEqual(Grove.compare(a, b).type, Grove.ComparisonResultType.DIFFERENT, 'Should be DIFFERENT');
    });
  });
});