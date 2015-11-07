rm -rf build
mkdir build
tsc -p test --outFile build/tests.js
node build/tests.js
