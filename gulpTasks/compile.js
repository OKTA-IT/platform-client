'use strict';

const gulp = require('gulp');
const shell = require('gulp-shell');

gulp.task('compile', shell.task([`webpack --process --progress --colors`]));
