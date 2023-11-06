var fs = require('fs');
var system = require('system');
var toc = require('toc');
var webpage = require('webpage');
var page = webpage.create();

var uri = system.args[1];

console.log("Starting up PhantomJS...");
var html = fs.read(uri, { mode: 'r', charset: 'utf-8' });
var toc_options = {
  anchorMax: 3,
  anchorMin: 1,
  header: '<h<%= level %><%= attrs %>><a href="#toc-<%= anchor %>" name="<%= anchor %>"><%= header %></a></h<%= level %>>',
  // Need to modify the text to get rid of the paragraph sign at the end of it
  openLI: '<li><a href="#<%= anchor %>" name="toc-<%= anchor %>"><%= text.substr(0, text.length - 3) %></a>',
  tocMax: 3,
  tocMin: 1
};
console.log("Creating TOC...");
fs.write('bundle/bundle_with_toc.html', toc.process(html, toc_options), {
  mode: 'w',
  charset: 'utf-8'
});

page.onError = function(msg, trace) {
  // Suppress IPython not found messages...
  if(!/IPython/.test(msg)) {
    console.error('Error:', msg);
    trace.forEach(function(item) {
      console.error('  ', item.file, ':', item.line);
    });
  }
};

console.log("Setting paper size...");
page.paperSize = {
  footer: {
    contents: phantom.callback(function(pageNum, numPages) {
      if(pageNum > 1) {
        return '<span style="float: right; font-size: 75%">' + pageNum + '/' + numPages + '</span>';
      } else {
        return '';
      }
    }),
    height: '1.2cm',
  },
  margin: {
	  top: '1in',
    left: '0.3in',
    right: '0.3in',
  },
  format: 'A4'
};

console.log("Start rendering to PDF...");
capture(page, 'bundle/bundle_with_toc.html', function(error) {
  if(error) {
    console.error('Error', error);
    phantom.exit(1);
  } else {
	console.log("PDF created, waiting for math rendering (2 mins) ... ");
	setTimeout(function(){ page.render('bundle/BMLIP-5SSD0.pdf', { format: 'pdf' }); console.log("Closing PhantomJS..."); phantom.exit(0);}, 120000);
  }
});

function capture(page, pageUrl, callback) {
  page.open(pageUrl, function(status) {
    var interval, allDone;

    if(status !== 'success') {
      callback(new Error('Error rendering page'));
      return;
    }

    allDone = page.evaluate(function() {
      if(window.MathJax) {
        MathJax.Hub.Register.StartupHook('End', function() {
          window.allDone = 1;
        });
        return false;
      } else {
        return true;
      }
    });

    if(allDone) {
      callback();
      return;
    }

    interval = setInterval(function() {
      var allDone = page.evaluate(function() {
        return window.allDone;
      });

      if(allDone) {
        clearInterval(interval);
        callback();
      }
    }, 10);
  });
};