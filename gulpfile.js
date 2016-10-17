const fs = require('fs');
const gulp = require('gulp');
const gutil = require('gulp-util');
// const html2pdf = require('gulp-html2pdf');
const html2pdf = require('gulp-html-pdf');
const markdown = require('github-markdown-render');
const plumber = require('gulp-plumber');
const tap = require('gulp-tap');
const through = require('through2')

// Gulpt task is borrowed from Robert Cambridge
// https://github.com/rcambrj/resume/blob/gh-pages/gulpfile.js
gulp.task('default', function() {
  return gulp.src('README.md')
  .pipe(plumber())
  .pipe(through.obj(function (file, enc, cb) {
    // get rendered markdown from github

    // todo: pull this out into a reusable gulp-plugin
    markdown(file.contents.toString())
    .then(html => {
      file.path = gutil.replaceExtension(file.path, '.html');
      file.contents = new Buffer(html);
      cb(null, file);
    })
    .catch(err => {
      this.emit('error', new gutil.PluginError('github-markdown-render', err));
      cb();
    });
  }))
  .pipe(tap(file => {
    // wrap in valid HTML and add github flavoured stylesheet

    const css = fs.readFileSync('node_modules/github-markdown-css/github-markdown.css');

    // ew. sorry.
    file.contents = Buffer.concat([
      new Buffer(`
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          @media print {
            html {
              zoom: 0.55; /*workaround for phantomJS2 rendering pages too large*/
            }
          }
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 900px;
            margin: 0 auto;
            padding: 15px;
          }
          .emoji {
            width: 1em;
          }
          g-emoji {
            padding-right: 8px;
          }
          ${css}
        </style>
        </head>
        <article class="markdown-body">
      `),
      file.contents,
      new Buffer(`
        </article>
        </html>
      `)
    ]);
  }))
  .pipe(gulp.dest('.'))
  .pipe(tap(file => {
    // fix emojis for PDF render
    // todo: can the g-emoji element be registered in the page's javascript?
    const original = file.contents.toString();
    const mangled = original.replace(/<g-emoji .*alias="([^"]+)".*fallback-src="([^"]+)".*>.*<\/g-emoji>/g, '<img class="emoji $1" src="$2" />');
    file.contents = new Buffer(mangled);
  }))
  .pipe(html2pdf({
    format: 'A4',
    orientation: 'portrait',
    border: '18mm',
  }))
  .pipe(gulp.dest('.'))
});
