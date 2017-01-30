var data = require('./../database/DataLayer.js').DataLayer;
var inference = require('./KeywordInference.js').KeywordInference;

var  crypto = require('crypto');
var url = require('url');
var colors = require('colors');
var keywordInference = new inference();
var dataApi = new data();

//the constructor for data gatherer this accepts the host, port and the callback on connection
UrlSink = function () {
}

UrlSink.prototype.generateKeywords = function (uri, rawData, callback) {
    var that = this;
    that.insertUriKeywords(uri, rawData, callback);
}

UrlSink.prototype.categorizeUrl = function(url, category, callback) {
    var that = this;
    var uri = decodeURIComponent(url);
    var hashId = that.getUrlHash(uri);
    dataApi.GetDocuments("categorizations", { hash: hashId }, null, function (error, docs) {
         if (error == null && (docs == undefined || docs.length <= 0)) {
             dataApi.SaveDocument("categorizations", {
                url: uri,
                hash: hashId,
                category: category
              }, function (error, document) {
                    if(error == null) {
                        callback(null, document);
                    }
              });
         } else {
            callback(null, {});
         }
    });

    console.log("the data api func was called");
}

UrlSink.prototype.getUrlHash = function(data) {
	var md5 = crypto.createHash('md5');
	md5.update(data);
	var value = md5.digest('hex');
	return value;
}

UrlSink.prototype.checkUriExists = function (uri, callback) {
    var that = this;
    var hashId = that.getUrlHash(uri);

    dataApi.GetDocuments("urls", { hash: hashId }, {}, function (error, docs) {
         if (error == null && (docs == undefined || docs.length <= 0)) {
            callback(false);
         } else {
            callback(true);
         }
    });
}

UrlSink.prototype.extractSummary = function(sentences) {
    var that = this;
    summary = "";

    for(var i = 0; i < sentences.length && i < 3; i++) {
        summary = summary + sentences[i].text;
    }

    summary = summary.replace(/(<([^>]+)>)/ig,"");
    return summary;
}

UrlSink.prototype.insertUriKeywords = function (uri, rawData, callback, linkImage) {
    var that = this;
    var hashId = that.getUrlHash(uri);

    dataApi.GetDocuments("urls", { hash: hashId }, {},  function (error, docs) {
        if (error == null && (docs == undefined || docs.length <= 0)) {
            keywordInference.scrubHtml(rawData, function (error, sentences) {
                if (error == null) {
                    keywordInference.analyzeText(sentences, function (error, chiSquare) {
                        if (error == null) {
                              var elements = [];
                              //get only first few toppers here
                              for(var chiIndex = 0; chiIndex < chiSquare.length && chiIndex < 25; chiIndex++) {
                                elements.push(chiSquare[chiIndex]);
                              }

                              if(elements.length >= 10) {

                                var summary = that.extractSummary(sentences);

                                dataApi.SaveDocument("urls", {
                                url: uri,
                                hash: hashId,
                                keys: elements,
                                summary:summary,
                                image: linkImage
                                }, function (error, document) {
                                    if(error == null) {
                                        console.log('saved document: ' + document);
                                        callback(document);
                                    }
                                });
                              } else {
                                callback(null);
                              }
                        } else {
                            callback(null);
                        }
                    });
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    });
}

exports.UrlSink = UrlSink;