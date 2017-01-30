var data = require('./../database/DataLayer.js').DataLayer;
var inference = require('./../api/KeywordInference.js').KeywordInference;

var  crypto = require('crypto');
var url = require('url');
var colors = require('colors');
var keywordInference = new inference();

var keywordInference = new inference();
var url = require('url')
var request = require('request');
var natural = require('natural');
var bayesClassifier = null;

//the constructor for data gatherer this accepts the host, port and the callback on connection
BayesClassifier= function () {

}

BayesClassifier.prototype.initializeClassifier = function() {
	var that = this;
	console.log("initialization started for classifier");
	if(bayesClassifier == null) {
		console.log("trying restore from file");
		that.classifier = that.restoreFromFile();
	}

	if(bayesClassifier == null) {
		that.isTrained = false;
		console.log("restore from file for classifier failed");
		that.initializeFromDatabase(function(error)  {

			if(that.classifier && (error == null)) {
				console.log("classifier initialized and is a valid object");
				that.isTrained = true;
				that.classifier.train();
				console.log("training completed");
			}

			console.log("serializing classifier to the file");
			that.saveToFile();
		});
	}
}

BayesClassifier.prototype.saveToFile = function() {
	var that = this;
	var json = JSON.stringify(that.classifier);
	console.log("the classification json is : " + json);
	 dataApi.SaveDocument("classifier", {
                    classifier: json,
                    id: 1
	  		}, function (error, document) {
     		});
}

BayesClassifier.prototype.restoreFromFile = function() {
	return null;
}

BayesClassifier.prototype.downloadHTTP = function (file_url, category, index, callback) {
    request(file_url, function (error, response, body) {
        if(error == null) {
            callback(file_url, category, index, body);
        } else {
            if (!error && response.statusCode == 200) {
                callback(index, '');
            }
        }
    });
}

BayesClassifier.prototype.classify = function(docs, index, callback) {
	var that = this;
	setTimeout(function() {
	that.downloadHTTP(docs[index].url, docs[index].category, index, function (url, category, index, rawData) {
			 keywordInference.scrubHtml(rawData, function (error, sentences, options) {
				 if (error == null) {
					 keywordInference.analyzeText(sentences, function (error, chiSquare) {
						//console.log("classification : " + keywords + " at " + JSON.stringify(options));

						if(chiSquare && chiSquare.length > 15) {
							that.classifier.addDocument(chiSquare, docs[index].category);
							console.log(colors.yellow(index) + "category: " + docs[index].category);
						}
						if(index > docs.length - 5 && !that.isTrained) {

							console.log(colors.red("classification model aggregated....ready to train..."));
							callback();
						}
					});
				}
			}, {index: index, url: url, category: category});
		});
	}, 70 * index);

}


BayesClassifier.prototype.initializeFromDatabase = function (callback) {
	var that = this;
	that.classifier = new natural.BayesClassifier();

	dataApi.GetDocuments("categorizations", null, null, function (error, docs) {
         if (error == null && (docs) && docs.length > 0) {
         console.log("total no of docs: " + docs.length);
         	for(var index = 0; index < docs.length; index++) {

         		if(docs[index].url) {
         			try {
						that.classify(docs, index, callback);
            		}
            		catch (error) {}
            	}
            }
         } else {
            callback("no documents available");
         }
	});
}

exports.BayesClassifier = BayesClassifier;

var dataApi = new data(null, function() {
	var bayesClassifier = new BayesClassifier();
	bayesClassifier.initializeClassifier();
});




