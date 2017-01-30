var data = require('./../database/DataLayer.js').DataLayer;
var crypto = require('crypto');
var url = require('url');
var colors = require('colors');
var dataApi = new data();
var natural = require('natural');

//the constructor for data gatherer this accepts the host, port and the callback on connection
Recommendations = function () {
	var that = this;
	that.classifier = null;
}

Recommendations.prototype.getUrlHash = function(data) {
	var md5 = crypto.createHash('md5');
	md5.update(data);
	var value = md5.digest('hex');
	return value;
}

Recommendations.prototype.classifyDocument = function (keys, callback) {
	var that = this;
	if(that.classifier == null) {
	 	dataApi.GetDocuments("classifier", null, null, function (error, articles) {
    		if (error == null && articles && articles.length > 0) {
    			that.classifier = natural.BayesClassifier.restore(JSON.parse(articles[0].classifier));
    			var classification = that.classifier.classify(keys);
                callback(classification);
    		} else {
    			callback('general');
    		}
    	});
	} else {
		var classification = that.classifier.classify(keys);
		callback(classification);
	}
}

Recommendations.prototype.getBarredRecommendationUrls = function(callback) {
	 dataApi.GetDocuments("filter_list", null, null, function (error, articles) {
    		if (error == null) {
    			callback(error, articles);
    		} else {
    			callback(error, []);
    		}
   	 });
}

Recommendations.prototype.getArticlesByKeyword = function (req, count, keyword, callback) {
	var findFilter = {};
	var search = "";

	if(keyword && keyword != null) {
		for(var index = 0; index < keyword.length && index < 25; index++) {
			//increase relevancy based on occurrence of the key
			search += keyword[index] + " ";
		}

		findFilter = {$text: { $search: search } };
        scoreFilter = { score: { $meta: "textScore" } };
	}
	else {
		findFilter = null;
		scoreFilter = null;
	}

	 console.log("Filter being used: " + JSON.stringify(findFilter));
	 dataApi.GetDocuments("urls", findFilter, scoreFilter, function (error, articles) {
		if (error == null) {
			callback(error, articles);
		} else {
			callback(error, []);
		}
	});
}

exports.Recommendations = Recommendations;