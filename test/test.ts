function assertEqual(a: any, b: any) {
  if (a != b) {
    throw new Error('TEST FAILURE: Values are not equal. Values are (' + a + ') and (' + b + ')');
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

class TestSuite {
  protected tests: Array<() => void>;

  protected setup(): void {}
  protected tearDown(): void {}

  public runTests() {
    console.log('Running ' + this.tests.length + ' tests');
    this.setup();
    for (var test of this.tests) {
      test();
    }
    this.tearDown();
    console.log('Done running ' + this.tests.length + ' tests');
  }
}