// TODO(ryan): use assertion failures with expected and actual so that mocha
// gives good error messages

function assertEqual(a:any, b:any, message: string = '') {
  if (a != b) {
    throw new Error('TEST FAILURE: Values are not equal. ' + JSON.stringify({
        left: a,
        right: b
      }) + (message.length > 0 ? (' message : ' + message) : '')
    );
  }
}

function assertRaises(func:any, message:string = '') {
  var didRaise = false;
  try {
    func();
  } catch (e) {
    didRaise = true;
  }

  if (!didRaise) {
    console.log('Message: ' + message);
    throw "TEST FAILURE: No exception thrown";
  }
}
