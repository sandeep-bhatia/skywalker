var MongoClient = require('mongodb').MongoClient;

DataLayer = function (connectUrl, callback) {
	console.log("calling data api");
	var that = this;
	if (this.db == null && !connectUrl) {
		console.log("DB not defined, so trying to create a connection now");
	    MongoClient.connect('mongodb://skywalker:skywalker@ds031883.mongolab.com:31883/urldb', function (err, database) {
        	if (err) {
        	    console("Database connectivity error: " + JSON.stringify(err));
            	throw err;
        	} else {
        		that.db = database;
            	console.log("successfully connected to the database");
            	if(callback) {
            		callback();
            	}
        	}
		});
	} else if (!this.db) {
		console.log("DB not defined, so trying to create a connection now");
	    MongoClient.connect(connectUrl, function (err, database) {
        	if (err) {
        	    console("Database connectivity error: " + JSON.stringify(err));
            	throw err;
        	} else {
        		that.db = database;
            	console.log("successfully connected to the database");
        	}
		});
	}
}

DataLayer.prototype.GetDocuments = function (collection, filter, scoreFilter, callback) {
	this.db.collection(collection, function (error, coll) {
		if (error) {
			callback(error);
		}
		else {
			if (filter != null && scoreFilter != null) {
				coll.find(filter, scoreFilter).sort({ score: { $meta: "textScore" } }).limit(50).toArray(function (err, docs) {
					callback(null, docs);
				});
			}
			else if (filter != null) {
				console.log("trying to find the collection");
				coll.find(filter).toArray(function (err, docs) {
					callback(null, docs);
				});
			}
			else {
				coll.find().toArray(function (err, docs) {
					callback(null, docs);
				});
			}
		}
	});
};

DataLayer.prototype.FindDocumentAndModify = function (collection, findExpression, modifiedExpression, callback) {
	this.db.collection(collection, function (error, collection) {
		if (error) {
			callback(error);
		}
		else {
			findAndModify(findExpression,
			[],
			modifiedExpression,
			function (error) {
				if (error == null) {
					callback(error, document);
				}
				else {
					callback(error);
				}
			});
		}
	});
};

DataLayer.prototype.SaveDocument = function (collection, document, callback) {
	this.db.collection(collection, function (error, collection) {
		if (error) {
			callback(error);
		}
		else {
			collection.insert(document, function (error) {
				if (error == null) {
					callback(null, document);
				}
				else {
					callback(error);
				}
			});
		}
	});
};

exports.DataLayer = DataLayer;
