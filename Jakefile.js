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

  jake.exec(cmd, {printStdout: true}, completion);
}

desc('This is the default task.');
task('default', function (params) {
  console.log('This is the default task.');
});


var BUILD = 'build';
var BUILD_SERVER = path.join(BUILD, 'server');
var BUILD_WWW = path.join(BUILD, 'www');
var BUILD_TEST = path.join(BUILD, 'test');

directory(BUILD_SERVER);
desc('This builds the server and puts it at \'' + BUILD_SERVER + '\'');
task('build-server', [BUILD_SERVER], function () {
  buildTypescriptFiles(
    ['src/server/server.ts'],
    path.join(BUILD_SERVER, 'server.js'), function () {
      console.log('Server built!');
    });
});

directory(BUILD_WWW);
desc('This copies all static files to the build directory');
task('copy-static', [BUILD_WWW], function () {
  jake.cpR('src/static', path.join(BUILD_WWW));
});

task('build-text-demo', ['copy-static'], function () {
  buildTypescriptFiles(
    ['src/ui/collaborative_text_controller.ts'],
    path.join(BUILD_WWW, 'static/js/collaborative-text-controller.js'), function () {
      console.log('Text demo built!');
    });
});

directory(BUILD_TEST);
desc('This compiles and runs all tests');
task('test', [BUILD_TEST], function () {
  var sources = [
    'test/ot/test_control.ts',
    'test/ot/test_text.ts'
  ];
  var output = path.join(BUILD_TEST, 'test.js');
  buildTypescriptFiles(sources, output, function () {

    jake.exec('$(npm bin)/mocha ' + output, {printStdout: true}, function () {
      console.log('Done running tests');
      complete();
    });
  });
});

task('all', ['build-server', 'build-text-demo'], function () {
});

watchTask(['build-server', 'build-text-demo'], function () {
  this.watchFiles.include([
    './**/*.ts'
  ]);
});
