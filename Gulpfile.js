'use strict';

var gulp = require('gulp');

var gulpSequence = require('gulp-sequence');
var sass = require('gulp-sass');
var nodemon = require('gulp-nodemon');
var autoprefixer = require('gulp-autoprefixer');
var Metalsmith = require("metalsmith");
var markdown = require("metalsmith-markdown");
var templates = require("metalsmith-templates");
var collections = require("metalsmith-collections");
var permalinks = require("metalsmith-permalinks");
var drafts = require("metalsmith-drafts");
var define = require("metalsmith-define");
var ignore = require('metalsmith-ignore');
var auth = require('./auth');
var dateFormatter = require('metalsmith-date-formatter');
var sftp = require('gulp-sftp');
var marked = require('marked');

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: true
});


const SASS_PATHS = [
  './node_modules/simplegrid'
];


const parseImageDescription = (files, metalsmith, done) => {
  for(let fileKey in files) {
    let file = files[fileKey];
    if (file.images) {
      for (let pos = 0; pos < file.images.length; pos += 1) {
        file.images[pos].description = marked(file.images[pos].description);
      }
    }
  }
  done();
};


gulp.task('css', (done) => {
  const sourcemaps = require('gulp-sourcemaps');
  gulp.src('./src/scss/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: SASS_PATHS
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['> 1%', 'last 2 versions', 'IE 9']
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./build/css'));
  done();
});

gulp.task('watch', (done) => {
  gulpSequence('metal', 'css', 'serve', 'browserSync', () => {
    gulp.watch('./src/**/*.scss', ['css']);
    gulp.watch('./src/**/*.md', ['metal','css']);
    gulp.watch('./templates/*.html', ['metal','css']);
    done();
  });
});

gulp.task('serve', (cb) => {
  var started = false;

	return nodemon({
    exec: 'node',
		script: 'server.js'
	}).on('start', function() {
		// to avoid nodemon being started multiple times
		if (!started) {
			cb();
			started = true;
		}
  });

});

gulp.task('browserSync', (done) => {
  const browserSync = require('browser-sync').create('bs-proxy');
  browserSync.init(null, {
    proxy: 'http://localhost:4000',
    files: ['build/css/*.css', 'build/js/*.js'],
    reloadDelay: 1000,
    port: 4001,
    open: false
  });
  done();
});

gulp.task('metal', () => {
  Metalsmith(__dirname)
    .clean(false)
    .source("src")
    .use(ignore([
      'scss/*'
    ]))
    .use(drafts())
    .use(collections({
      pages: {
        pattern: "pages/*.md"
      },
      projects: {
        pattern: "projects/*.md",
        sortBy: "startdate",
        reverse: true
      }
    }))
    .use(markdown({
      "smartypants": true,
      "gfm": true,
      "tables": true
    }))
    .use(permalinks({
      pattern: ":collection/:title"
    }))
    .use(dateFormatter({
      dates: [
        {
          key: 'startdate',
          format: 'MMM YY'
        },
        {
          key: 'enddate',
          format: 'MMM YY'
        }
      ]
    }))
    .use(parseImageDescription)
    .use(auth({
      serverPath: process.env.REMOTEPATH,
      authName: 'Protected Projects',
      username: process.env.USER,
      password: process.env.PASSWORD
    }))
    .use(templates({
      engine: "nunjucks",
      directory: "templates"
    }))
    .destination("build")
    .build(function(err) {
      if (err) {console.log(err);}
    });
});

gulp.task('deploy', () => {
  return gulp.src('build/**/*')
    .pipe(sftp({
      host: process.env.HOST,
      user: process.env.USER,
      pass: process.env.PASSWORD,
      remotePath: process.env.REMOTEPATH
    }));

});

gulp.task('default', ['metal','css']);
