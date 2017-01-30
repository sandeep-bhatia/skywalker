var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var users = require('./routes/users');
var url = require('url')
var request = require('request');
var inference = require('./../api/Keywordinference.js').KeywordInference;
var keywordInference = new inference();
var app = express();
var recommendationsApi = require('./../api/Recommendations.js').Recommendations;
var utilities = require('./../api/Utilities.js').Utility;
var recommendations = new recommendationsApi();
var utility = new utilities();
var barredRecos = null;

var urlSink = require('./../api/UrlSink.js').UrlSink;
var sink = new urlSink();
var defaultArticleSummary = "Lorem ipsum dolor sit amet, vel cu dolore principes appellantur. Ea per modus intellegat, quando dictas civibus nam in. Ex nullam erroribus posidonium sit, hinc vidit ad pri. Duis idque debet no eum, ea pro elit vocent."

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);


var barredRecommendations = function () {
    if(barredRecos == null) {
        barredRecos = [];
        recommendations.getBarredRecommendationUrls(function(error, barredUrls) {
            if(error == null) {
                console.log(JSON.stringify(barredUrls));
                for(var index = 0; index < barredUrls; index++) {
                    barredRecos.push(barredUrls[index].url);
                }
            }
        });
    }
}

var downloadHTTP = function (file_url, callback) {
    request(file_url, function (error, response, body) {
        if(error == null) {
            callback(body);
        } else {
            if (!error && response.statusCode == 200) {
                callback(' ');
            }
        }
    });
}



app.use('/style.css', function(req, res, next) {
    res.sendfile('./public/stylesheets/style.css');
});
app.use('/recommendations.js', function(req, res, next) {
    res.sendfile('./public/javascripts/recommendations.js');
});

app.use('/ask', function(req, res, next) {
    res.sendfile('./public/recommendations.html');
});

app.use('/categorizerWindow', function(req, res, next) {
    res.sendfile('./public/categorizerSubmission.html');
});

app.use('/categorizationUrl', function(req, res, next) {
    var url_parts=url.parse(req.url, true);
    var query = url_parts.query;
    //console.log("query:" + JSON.stringify(query));
    var articleRead = query.url;
    var category = query.category;

    if(category) {
        console.log("calling sink to categorize");
        sink.categorizeUrl(articleRead, category, function (error, doc) {
            console.log(JSON.stringify(doc));
            res.end();
        });
    }

});

app.use('/categorizer', function(req, res, next) {
    res.sendfile('./public/categorizer.html');
});

app.use('/recommendations', function(req, res, next) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    recommendations.getBarredRecommendationUrls(function(error, barredUrls) {
    var barredRecos = [];
    if(error == null) {
         console.log(JSON.stringify(barredUrls));
         for(var index = 0; index < barredUrls.length; index++) {
             barredRecos.push(barredUrls[index].url);
         }
    }
    downloadHTTP(query.url, function (rawData) {
        keywordInference.scrubHtml(rawData, function (error, sentences) {
            if (error == null) {
                keywordInference.analyzeText(sentences, function (error, chiSquare) {
                        console.log("keywords for the current article are " + JSON.stringify(chiSquare))
                        console.log("Printing the barred URLs");
                        console.log(JSON.stringify(barredRecos));
                        recommendations.classifyDocument(chiSquare, function (category) {
                            console.log("Classification for the current article detected as " + category);
                            req.urlCategory = category;

                            recommendations.getArticlesByKeyword(req, 10, chiSquare, function (error, articles) {
                                if (error == null && articles && articles.length) {
                                    var generalValues = [];
                                    var notGeneralValues = [];
                                    var matchedCategory = [];
                                    for(var index = 0; index < articles.length; index++) {
                                        if(utility.isValidUrl(query.url, barredRecos, articles[index].url)) {
                                            recommendations.classifyDocument(articles[index].keys, function (foundCategory) {

                                                if(articles[index].keys && (articles[index].keys.length > 0)) {

                                                    if(!articles[index].summary) {
                                                        articles[index].summary = defaultArticleSummary;
                                                    }

                                                    if(!(articles[index].image && articles[index].image.length > 0)) {
                                                        articles[index].image = "images/article_noimage.png";
                                                    }

                                                    console.log(articles[index].image);
                                                    var hostName = url.parse(articles[index].url).hostname;
                                                    if(articles[index] && articles[index].summary && articles[index].summary.length > 100 && articles[index].summary.toLowerCase().indexOf("please check your browser settings") < 0) {
                                                        if(foundCategory == "General") {
                                                            generalValues.push({url: articles[index].url, hash: articles[index].hash, score: articles[index].score, category: foundCategory, image: articles[index].image, summary: articles[index].summary, hostName: hostName } );
                                                        } else if ((foundCategory == req.urlCategory) && index < 25) {
                                                            matchedCategory.push({url: articles[index].url, hash: articles[index].hash, score: articles[index].score, category: foundCategory, image: articles[index].image, summary: articles[index].summary , hostName: hostName} );
                                                        } else {
                                                            notGeneralValues.push({url: articles[index].url, hash: articles[index].hash, score: articles[index].score, category: foundCategory, image: articles[index].image, summary: articles[index].summary , hostName: hostName} );
                                                        }
                                                    }
                                                }

                                                if (index == articles.length - 1) {
                                                    notGeneralValues = matchedCategory.concat(notGeneralValues);
                                                    var total = notGeneralValues.concat(generalValues);
                                                    res.end(JSON.stringify(total));
                                                }

                                            });
                                        }
                                    }
                                } else {
                                    res.end();
                                }
                            });
                        });
               });
            }
        });
    });
    });
});

app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
var server = app.listen(8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Server listening at http://%s:%s', host, port);
});