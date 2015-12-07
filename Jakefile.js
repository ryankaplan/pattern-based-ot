var path = require('path');

var tscKwOpts = {
  'm': 'commonjs',

  // Necessary for getters and setters
  't': 'ES5'
};

var tscOpts = [
  'noImplicitAny',
  'removeComments',
  'preserveConstEnums',
  'sourceMap'
];

function buildTypescriptFiles(files, outFile, completion) {
  var cmd = '$(npm bin)/tsc ';

  for (var i = 0; i < files.length; i++) {
    cmd += files[i] + ' ';
  }

  cmd += '--out ' + outFile + ' ';

  for (var i = 0; i < tscOpts.length; i++) {
    cmd += '--' + tscOpts[i] + ' ';
  }

  for (var key in tscKwOpts) {
    cmd += '-' + key + ' ' + tscKwOpts[key] + ' ';
  }

  console.log('Running command', cmd);
  jake.exec(cmd, {printStdout: true}, completion);
}

desc('This is the default task.');
task('default', function (params) {
  console.log('This is the default task.');
});

// Root folder for all build products
var DIR_BUILD = 'build';

// Root folder for collaborative text editor demo build products
var DIR_BUILD_DEMO = path.join(DIR_BUILD, 'demos', 'collaborative-text-editor');

// Root folder for test build products
var DIR_BUILD_TEST = path.join(DIR_BUILD, 'test');

directory(DIR_BUILD_DEMO);
directory(DIR_BUILD_TEST);

// Builds demo server, moves it to the build folder
task('server', [DIR_BUILD_DEMO], function () {
  buildTypescriptFiles(
    ['src/demos/collaborative-text-editor/server.ts'],
    path.join(DIR_BUILD_DEMO, 'server.js'), function () {
      console.log('Server built!');
    });
});

// Moves static files to the right place for the demo
task('copy-static', [DIR_BUILD_DEMO], function () {
  jake.cpR('src/demos/collaborative-text-editor/static', DIR_BUILD_DEMO);
});

desc('Build collaborative text demo')
task('demo', ['copy-static', 'server'], function () {
  buildTypescriptFiles(
    ['src/demos/collaborative-text-editor/client.ts'],
    path.join(DIR_BUILD_DEMO, 'static/js/client.js'), function () {
      console.log('Text demo built!');
    });
});

desc('Watch and build the collaborative text demo')
watchTask(['demo'], function () {
  this.watchFiles.include([
    './**/*.ts'
  ]);
});

desc('Compile and run all tests');
task('test', [DIR_BUILD_TEST], function () {
  var sources = [
    // Test control algorithm
    'test/ot/test_control.ts',

    // Test Char operations
    'test/ot/char/model.ts',
    'test/ot/char/operation.ts',

    // Test Grove operations
    'test/ot/grove/address.ts',
    'test/ot/grove/model.ts',
    'test/ot/grove/operation.ts'
  ];
  var output = path.join(DIR_BUILD_TEST, 'test.js');
  buildTypescriptFiles(sources, output, function () {

    jake.exec('$(npm bin)/mocha ' + output, {printStdout: true}, function () {
      console.log('Done running tests');
      complete();
    });
  });
});
