const fs = require('fs');
const gulp = require('gulp');
const gutil = require('gulp-util');
const html2pdf = require('gulp-html2pdf');
const markdown = require('github-markdown-render');
const plumber = require('gulp-plumber');
const tap = require('gulp-tap');
const through = require('through2');
const JSDOM = require('jsdom').JSDOM;
const emoji = require('emoji');

// Gulpt task is borrowed from Robert Cambridge
// https://github.com/rcambrj/resume/blob/gh-pages/gulpfile.js

const fixEmojis = original => {
  const dom = new JSDOM(original);
  const emojiNodes = dom.window.document.querySelectorAll('g-emoji')
  emojiNodes.forEach(emojiNode => {
    const parentNode = emojiNode.parentNode;
    const char = emojiNode.textContent;
    const imgTag = JSDOM.fragment(emoji.unifiedToHTML(char));
    parentNode.insertBefore(imgTag, emojiNode)
    parentNode.removeChild(emojiNode)
  })
  return dom.window.document.documentElement.innerHTML;
}

gulp.task('default', function() {
  return gulp.src('README.md')
  .pipe(plumber())
  .pipe(through.obj(function (file, enc, cb) {
    // get rendered markdown from github

    // todo: pull this out into a reusable gulp-plugin
    markdown(file.contents.toString())
    .then(html => {
      file.path = gutil.replaceExtension(file.path, '.html');

      file.contents = new Buffer(fixEmojis(html));
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
        <link href="http://cdn.staticfile.org/emoji/0.2.2/emoji.css" rel="stylesheet" type="text/css" />
        <style>
          @media print {
            @import url('https://fonts.googleapis.com/css?family=Roboto:400,600,700,900&display=swap');
            .markdown-body {
              width: 780px;
              margin-top: 150px !important;
              margin-bottom: 60px !important;
              font-size: 14px;
            }
          }
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 840px;
            margin: 0 auto;
            margin-top: 50px !important;
            padding: 15px;
          }
          .markdown-body strong {
            font-weight: 700 !important;
          }
          .markdown-body h1,h2,h3,h4 {
            font-weight: 600 !important;
          }
          .markdown-body h3 {
            margin-bottom: 5px !important;
          }
          .markdown-body h5 {
            margin-top: -5px !important;
            margin-bottom: 20px !important;
            font-weight: 300 !important;
            color: #696969 !important;
          }
          .markdown-body hr {
            height: 2px !important;
          }
          .markdown-body h2 .emoji {
            vertical-align: baseline !important;
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
  .pipe(html2pdf({
    printMediaType: true,
    images: true,
  }))
  .pipe(gulp.dest('.'))
});
