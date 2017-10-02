'use strict';

// Install: you must install gulp both globally *and* locally.
// Make sure you `$ npm install -g gulp`

/**
 * Dependencies
 */

var gulp = require('gulp');
var $ = require('gulp-load-plugins')({ lazy: true });
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var runSequence = require('run-sequence');
var Notification = require('node-notifier');
var notifier = new Notification();
var cache = require('gulp-cached');

var ts = require('gulp-typescript');
var tsProject = ts.createProject("tsconfig.json");

/**
 * Banner
 */

var pkg = require('./package.json');
var banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n');

/**
 * Paths
 */

var paths = {
  clean: [],
  lint: [
    // server
    'src/**/*.js',
    'gulpfile.js'
  ],
  js: ['src/**/*.js', 'src/**/*.ts', '!gulpfile*.js', '!node_modules/**', '!dist/**', '!scripts/**'],
  sql: [
    '**/*.sql'
  ]
};

/**
 * JSHint Files
 */

gulp.task('lint', function () {
  return gulp.src(paths.lint)               // Read .js files
    .pipe($.jshint())                       // lint .js files
    .pipe($.jshint.reporter('jshint-stylish'));
});

/**
 * Build Task
 *   - Build all the things...
 */

gulp.task('typescript', function(cb) {
  return tsProject.src()
    .pipe($.plumber())
    .pipe(cache('typescript'))
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', {
      sourceRoot: __dirname
    }))
    .pipe(gulp.dest('dist'))
});

gulp.task('misc', function(cb) {
  return gulp.src(['sql/**/*', 'test/mocha.opts', 'package.json', '!node_modules/**', '!dist/**'], {base: '.'})
    .pipe($.plumber())
    .pipe(cache('misc'))
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function() {
  del.sync('dist');
});

gulp.task('build', ['typescript', 'js-copy', 'misc']);

/**
 * Nodemon Task
 */

var nodemonProcess;

gulp.task('nodemon', ['build'], function (cb) {
  $.livereload.listen();
  var called = false;
  nodemonProcess = $.nodemon({
    script: 'dist/app_cluster.js',
    verbose: false,
    env: { 'NODE_ENV': process.env.NODE_ENV || 'development' },
    ext: 'js ts sql',
    watch: 'dist',
    ignore: [
      'gulpfile.js',
      'dist/',
      'scripts/',
      'node_modules/',
      'tmp/'
    ],
  });

  nodemonProcess.on('start', function () {
      setTimeout(function () {
        if (!called) {
          called = true;
          cb();
        }
      }, 3000);  // wait for start
    })
    .on('restart', function () {
      setTimeout(function () {
        $.livereload.changed('/');
        notifier.notify({
          message: 'Carevoyance DEV reloaded'
        });
      }, 3000);  // wait for restart
    });
});


/**
 * Default Task
 */

gulp.task('rebuild', ['build'], function() {
  nodemonProcess.emit('restart');
});

gulp.task('default', ['nodemon'], function () {
  gulp.watch(paths.sql.concat(paths.js), ['rebuild']);
});

gulp.task('production', ['build'], function () {
  console.log('DONE PRODUCTION');
});
