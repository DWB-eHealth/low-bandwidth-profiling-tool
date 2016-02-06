var gulp = require('gulp');
var serve = require('gulp-serve');

gulp.task('serve', serve({
    root: './',
    port: 8001
}));