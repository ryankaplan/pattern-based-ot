var path = require('path');

desc('This is the default task.');
task('default', function (params) {
  console.log('This is the default task.');
});

// Declare build product info
var buildDir = 'build';
var testDir = 'test';
var srcDir = 'src';

var targets = {
  // Output a test.js file which runs all of our tests
  'test': {
    buildDir: path.join(buildDir, 'test'),
    tsProducts: {
      test: {
        tsConfig: testDir,
        out: path.join(buildDir, 'test', 'test.js')
      }
    }
  },

  // Output a directory that lets a user browse and play with
  // demos that use the pbot library
  'demos': {
    buildDir: path.join(buildDir, 'demos'),
    staticDir: path.join(srcDir, 'demos', 'static'),
    tsProducts: {
      textDemoClient: {
        tsConfig: path.join(srcDir, 'demos', 'textDemoClient'),
        out: path.join(buildDir, 'demos', 'static', 'js', 'textDemoClient.js')
      },

/*
      shapesDemoClient: {
        tsConfig: path.join(srcDir, 'demos', 'shapes', 'shapesDemoClient'),
        out: path.join(buildDir, 'demos', 'shapes', 'static', 'js', 'shapesDemoClient.js')
      },
*/
      server: {
        tsConfig: path.join(srcDir, 'demos', 'server'),
        out: path.join(buildDir, 'demos', 'server.js')
      }
    }
  }
};

function tsCompileCmd(tsProduct) {
  return '$(npm bin)/tsc -p ' + tsProduct['tsConfig'] + ' --out ' + tsProduct['out'];
}

function compileTsProduct(tsProduct, done) {
  jake.exec(
    tsCompileCmd(tsProduct),
    { printStdout: true },
    done
  );
}

////////// demo tasks  //////////

var buildDir = targets['demos']['buildDir'];
directory(buildDir);

desc('Build a website for viewing and playing with pbot demos');
task('demos', [buildDir], function () {
  var target = targets['demos'];

  jake.cpR(target['staticDir'], buildDir);

  compileTsProduct(target['tsProducts']['textDemoClient'], function () {
    compileTsProduct(target['tsProducts']['server'], complete);
  });
});

////////// watch task  //////////

desc('Watch and build the collaborative text demo');
watchTask(['demos'], function () {
  this.watchFiles.include([
    './**/*.ts',
    './**/*.html',
    '.**/*.css'
  ]);
});

////////// test tasks  //////////

desc('Compile and run all tests');
task('test', [buildDir], function () {
  var target = targets['test'];
  var product = target['tsProducts']['test'];

  compileTsProduct(product, function () {
    jake.exec('$(npm bin)/mocha ' + product['out'], { printStdout: true }, function () {
      console.log('Done running tests');
      complete();
    });
  });
});
