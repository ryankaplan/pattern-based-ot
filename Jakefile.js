var path = require('path');

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

// Moves static files to the right place for the demo
task('copy-static', [DIR_BUILD_DEMO], function () {
  jake.cpR('src/demos/collaborative-text-editor/static', DIR_BUILD_DEMO);
});

// Builds demo server, moves it to the build folder
task('server', [DIR_BUILD_DEMO], function (complete) {
  jake.exec('$(npm bin)/tsc -p src/demos/collaborative-text-editor/server', {printStdout: true}, complete);
});

desc('Build collaborative text demo')
task('demo', ['copy-static', 'server'], function (complete) {
  jake.exec('$(npm bin)/tsc -p src/demos/collaborative-text-editor/client', {printStdout: true}, complete);
});

desc('Watch and build the collaborative text demo')
watchTask(['demo'], function () {
  this.watchFiles.include([
    './**/*.ts'
  ]);
});

desc('Compile and run all tests');
task('test', [DIR_BUILD_TEST], function () {
  var output = path.join(DIR_BUILD_TEST, 'test.js');
  jake.exec('$(npm bin)/tsc -p test', {printStdout: true}, function () {
    jake.exec('$(npm bin)/mocha ' + output, {printStdout: true}, function () {
      console.log('Done running tests');
      complete();
    });
  });
});
