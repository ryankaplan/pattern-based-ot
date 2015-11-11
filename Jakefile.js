
var path = require('path');

function execCommand(tag, cmd, failure) {
    var ex = jake.createExec([cmd]);

    ex.addListener("stdout", function(output) {
        process.stdout.write(output);
    });

    ex.addListener("stderr", function (error) {
        process.stderr.write(error);
    });

    ex.addListener("cmdEnd", function () {
        complete();
    });

    ex.addListener("error", function () {
        failure();
        console.log("Compilation with tag (" + tag + ") failed.");
    });

    ex.run();
};


var tscKwOpts = {
    'm': 'commonjs',
};

var tscOpts = [
    'noImplicitAny',
    'removeComments',
    'preserveConstEnums',
    'sourceMap'
];

function buildTypescriptFiles (files, outFile) {
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

    execCommand('Typescript Compiler', cmd, function () {
        // TODO(ryan)
    });
}

var BUILD_DIR = 'build';
var SERVER_BUILD_DIR = path.join(BUILD_DIR, 'server');
var WWW_BUILD_DIR = path.join(BUILD_DIR, 'www');

desc('This is the default task.');
task('default', function (params) {
    console.log('This is the default task.');
});

var BUILD = 'build';
var BUILD_SERVER = path.join(BUILD, 'server');
var BUILD_WWW = path.join(BUILD, 'www');
var BUILD_TEST = path.join(BUILD, 'test');

directory(BUILD_SERVER);

desc('This builds the server and puts it at \'' + SERVER_BUILD_DIR + '\'');
task('build-server', [BUILD_SERVER], function () {
    buildTypescriptFiles(['src/server/server.ts'], path.join(SERVER_BUILD_DIR, 'server.js'));
});

directory(BUILD_WWW);

desc('This copies all static files to the build directory');
task('copy-static', [BUILD_WWW], function () {
    jake.cpR('src/static', path.join(WWW_BUILD_DIR));
});

task('build-text-demo', ['copy-static'], function () {
    buildTypescriptFiles(
        ['src/ui/collaborative_text_controller.ts'],
        path.join(BUILD_DIR, 'www/static/js/collaborative-text-controller.js')
    );
});

task('test', [BUILD_DIR], function () {
    buildTypescriptFiles(
        ['test/ot/test_control.ts', 'test/ot/test_text.ts'],
        'build/test.js'
    );

    jake.exec('$(npm bin)/mocha build/test.js', { printStdout: true }, function () {
        console.log('Done running tests');
        complete();
    });
});

task('all', ['build-server', 'build-text-demo'], function () {});

watchTask(['build-server', 'build-text-demo'], function () {
   this.watchFiles.include([
       './**/*.ts'
   ]);
});
