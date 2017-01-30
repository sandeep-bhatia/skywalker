var request = require('request');
var cheerio = require('cheerio');
var events = require('events')
var url = require('url');
var htmlToText = require('html-to-text');
var urlSink = require('./../api/UrlSink.js').UrlSink;

var sink = new urlSink();
var eventEmitter = new events.EventEmitter();
var queue = [];

function validateUri(uri) {
  if(uri == null || uri == undefined || (uri.indexOf("mail:") > 0) || (uri.indexOf("javascript:") > 0)) {
    return false;
  }

  return true;
}

eventEmitter.on('onUrl', function(uri) {
//attempt to avoid call stack exception
  setTimeout(function () {
    request({uri: uri, timeout: 1000}, function(err, response, body) {
      if (!err && response.statusCode == 200) {
        console.log(uri);
        var $ = cheerio.load(body);
        var text = htmlToText.fromString(body, {});
        var image = $("img").first();
        console.log("uri: " + uri);
        var imageSrc = image.attr("src");
        console.log("image src: " + imageSrc);
        var linkImage = undefined;
        if(imageSrc) {
            linkImage = url.resolve(uri, imageSrc);
        }

        sink.insertUriKeywords(uri, text, function(doc) {
           if(doc != null) {
               console.log("inserted record : " + JSON.stringify(doc));
           }
        }, linkImage);

        $('a').map(function(i, e) {
            try {
                var link = $(e).attr('href');
                if(link && (link.indexOf("mail:") < 0) && (link.indexOf("javascript:") < 0)) {
                    var absoluteLink = url.resolve(uri, link).trim();
                    sink.checkUriExists(absoluteLink, function(doesExist) {
                        if(!doesExist) {
                            //max on your queue length
                            if(queue.length < 100) {
                                queue.push(absoluteLink);
                            }
                        }
                    });
                }
            } catch (error) {
                console.log("error :" + error + " " + uri);
            }
        });

        };
      });
    }, 1000);
});

setInterval(function() {
  if(queue.length > 0) {
      for(var i = 0; i < 100 && queue.length > 0; i++) {
          var url = queue.shift();
          eventEmitter.emit('onUrl', url);
      }
  }
}, 2000);

queue.push('http://www.punjabkesari.com/');
queue.push('http://news.yahoo.com/');
queue.push('http://www.aol.com/news/');
queue.push('http://www.bing.com/news');
queue.push('http://news.google.com/');
queue.push('http://fark.com/');
queue.push('http://regator.com/');
queue.push('http://www.punjabkesari.com/');
queue.push('http://www.punjabkesari.com/');



