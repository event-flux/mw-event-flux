var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var ts = require("gulp-typescript");
var merge = require('merge2'); 

gulp.task('clean', function() {
  return del([
    'lib/**/*',
    'dist/**/*'
  ]);
});

gulp.task('babel', function() {
	return gulp.src('src/**/*.js')
		.pipe(babel())
		.pipe(gulp.dest('lib/'));
});

var tsProject = ts.createProject("tsconfig.json");
gulp.task('ts', function () {
  var tsResult = gulp.src(['src/**/*.ts', 'src/**/*.tsx'])
    .pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest('lib')),
    tsResult.js.pipe(gulp.dest('lib'))
  ]);
});

gulp.task('default', gulp.series('clean', 'babel', 'ts'));
