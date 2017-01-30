//the constructor for data gatherer this accepts the host, port and the callback on connection
var JQuery = require('jquery');
var natural = require('natural');
var stopwords = require('./StopWords.js').words;
var POSTagger = require('./POSTagger.js').POSTagger;
var Lexer = require('./Lexer.js').Lexer;


KeywordInference = function () {
}

KeywordInference.prototype.removeScript = function (text) {
    return text = text.replace(/\n/g, '{n}').replace(/<script.*?<\/script>/g, '').replace(/{n}/g, '\n');
};

KeywordInference.prototype.filterJqueryText = function (text) {
    try {
        return JQuery(text).text();
    } catch (error) {
        return '';
    }
};

KeywordInference.prototype.generateKeywords = function (rawData) {
    var originalThis = this;
    var posTagger = new POSTagger();
    var lexer = new Lexer(function () {
    });

    originalThis.scrubHtml(rawData, lexer, posTagger, function (error, sentences) {
        if (error == null) {
            originalThis.analyzeText(sentences, function (error, chiSquare) {
                if (error == null) {
                    console.log(chiSquare);
                }
            });
        }
    });
}

KeywordInference.prototype.splitSentences = function (text) {
    //get the sentences from the text
    var result = text.match(/[^\.!\?]+[\.!\?]+/g);
    return result;
};

KeywordInference.prototype.getAnnotationScore = function (userannotation, lexer, posTagger, chivalue, callback) {
    var baseMatch = 0;
    var words = [];
    var filteredSentences = [];
    var chicounts = {};
    var score = baseMatch;

    if (chivalue == undefined || chivalue == null || chivalue.length <= 0 || userannotation == undefined || userannotation == null || userannotation.annotation == undefined || userannotation.annotation.annotation == "") {
        callback(null, baseMatch);
        return;
    }
    else {
        for (var index = 0; index < chivalue.length; index++) {
            if (chicounts[chivalue[index]] == undefined) {
                chicounts[chivalue[index]] = chivalue.length - index;
            }
        }
    }
    var result = this.splitSentences(userannotation.annotation);
    if (result == null && userannotation.annotation != null) {
        result = [];
        result.push(userannotation.annotation);
    }

    for (sentenceIndex in result) {
        if (!this.invalidText(result[sentenceIndex])) {
            var sentence = result[sentenceIndex].trim();
            var words = lexer.lex(sentence);
            var taggedWords = posTagger.tag(words);
            if (taggedWords.length > 0) {
                for (var tagIndex = 0; tagIndex < taggedWords.length; tagIndex++) {
                    var currentWord = taggedWords[tagIndex];
                    var currentTag = currentWord[1];
                    var currentTextWord = currentWord[0];
                    if (this.isValidWord(currentTextWord, currentTag)) {
                        if (chicounts[currentTextWord.trim()] != undefined) {
                            score = score + chicounts[currentTextWord.trim()];
                        }
                    }
                }
            }
            else {
                callback(null, baseMatch);
                return;
            }
        }
    }


    if (score > 0) {
        score = Math.log(score);
    }
    callback(null, score);
}

KeywordInference.prototype.setPerf = function (value) {
    this.perf = value;
}

//this method needs to be polished to get the crisp filtering done                                        
KeywordInference.prototype.scrubHtml = function (text, callback,options) {
    var posTagger = new POSTagger();
    var lexer = new Lexer(function () {
    });
    var sentences = new Array();
    var result = this.splitSentences(text);
    for (sentenceIndex in result) {
        if (!this.invalidText(result[sentenceIndex])) {
            var sentence = result[sentenceIndex].trim();
            var words = lexer.lex(sentence);
            var taggedWords = posTagger.tag(words);
            sentences.push({ 'index': sentenceIndex, 'text': sentence, 'taggedWords': taggedWords });
        }
    }

    callback(null, sentences, options);

}

KeywordInference.prototype.invalidText = function (data) {
    var id = -1;
    try {
        //id = this.utility.push('invalid Text');
        var specialCharacters = "!@^*+=\#\\/{}|\"<>~_";
        for (var i = 0; i < data.length; i++) {
            if (specialCharacters.indexOf(data.charAt(i)) != -1) {
                return true;
            }
            if (data.indexOf("\"\[") >= 0 || data.indexOf("function\(") >= 0) {
                return true;
            }
        }

        if (data.length <= 2) {
            return true;
        }

        //not considering two word sentences
        var splitWords = data.trim().split(" ");
        if (splitWords.length <= 2) {
            return true;
        }

        return false;
    }
    finally {
        //this.utility.pop('invalid Text', id);
    }
}

KeywordInference.prototype.isValidWord = function (textWord, tagTerm) {
    var that = this;
    if (stopwords.indexOf(textWord) > 0) {
        return false;
    }

    if (tagTerm == 'NNP' || tagTerm == 'NN' || tagTerm == 'VBG' || tagTerm == 'NNS') {
        if (textWord.trim().length > 2 && textWord.indexOf('-') < 0 && textWord.indexOf(']') < 0 &&
        (textWord.indexOf('[') < 0)
        && textWord.indexOf("html") < 0 && textWord.toLowerCase().indexOf("getelement") < 0 && textWord.indexOf("window") < 0 && textWord.indexOf("&")
        && (textWord.toLowerCase().indexOf("(") < 0)
        && (textWord.toLowerCase().indexOf(")") < 0)
        && (textWord.indexOf(":") < 0)
        && (textWord.indexOf(";") < 0)
        && (textWord.indexOf("func") < 0)
        && (textWord.indexOf("googletag") < 0)
        ) {
            return true;
        }
    }


    return false;
};

KeywordInference.prototype.computePairHash = function (firstWordId, secondWordId) {
    var x;
    var y;

    //use the unique cantor pairing function here to compute the unique single no from the two numbers
    //create the positional bias by preferring the lesser number
    if (firstWordId < secondWordId) {
        x = firstWordId;
        y = secondWordId;
    }
    else {
        x = secondWordId;
        y = firstWordId;
    }
    //http://en.wikipedia.org/wiki/Pairing_function
    return 1 / 2 * (x + y) * (x + y + 1) + y;
};

/****************************************************************************************************************************************
tracing helper function
**************************************************************i***************************************************************************/
KeywordInference.prototype.frequencyWordsPrint = function (frequencyWordCountPercentage, sortedCountWords, symbolTableIdWord, totalWordCount) {
    var id = -1;
    try {
        //id = this.utility.push('frequency words');
        var idx = 0;
        var countThreshold = frequencyWordCountPercentage * sortedCountWords.length / 100;

        if (global && global.traceObject && global.traceObject.isTracingEnabled()) {
            for (var wordIdx in sortedCountWords) {
                if (idx >= countThreshold) {
                    break;
                }
                idx++;
            }
        }
    }
    finally {
    }
};

/*****************************************************************************************************************************************
The method is heart of inference, the logic is simple though if understood well 

We have to apply the chisquare formula to get the values, w is any word and g is frequent word 
Chi Square (w) = SUM over all g ((freq(w,g) - nw * pg ) pow (2) / nw * pg)
nw and pg are sum of counts of terms of sentences in which w and g occurred, so computationally they are same values but logically different

Parent method prepares the data structures and calls the compute chi square values helper function to compute chi square values based on these 
data structures.
*****************************************************************************************************************************************/
KeywordInference.prototype.analyzeText = function (sentences, callback, options) {
    var that = this;
    var id = -1;
    try {
        //id = this.utility.push('analyze text');
        var currentWord;
        var totalWordCount = 0;
        var currentTag;
        var symbolTableWordId = {};
        var symbolTableIdWord = {};
        var uniqueId = 0;
        var currentTextWord = null;
        var countWords = {};
        var sentenceWordCount = 0;
        var sentenceWordIds = {};
        var currentWordId;
        var firstInPair = 0;
        var secondInPair = 0;
        var pairHash = 0;
        var pairHashCounts = {};
        var sortedCountWords = [];
        var idx = 0;
        var countThreshold = 50;
        var frequencyWordCountPercentage = 15;
        var wordConsiderationPercentage = 30;
        var sortedChiSquareValues = [];
        //total no of terms in sentences where a word appears
        var wordBelongingSentenceTermCounts = {};
        //return twice this count of related words and high freq words
        var returnWordCount = 25;
        var returnWords = [];

        for (var sentenceIdx in sentences) {
            sentenceWordCount = 0;
            for (var wordIdx in sentences[sentenceIdx].taggedWords) {
                currentWord = sentences[sentenceIdx].taggedWords[wordIdx];
                currentTextWord = currentWord[0];
                currentTag = currentWord[1];

                if (this.isValidWord(currentTextWord, currentTag)) {
                    sentenceWordCount += 1;
                }
            }

            sentenceWordIds = {};

            for (wordIdx in sentences[sentenceIdx].taggedWords) {
                currentWord = sentences[sentenceIdx].taggedWords[wordIdx];
                currentTag = currentWord[1];
                currentTextWord = currentWord[0];

                if (this.isValidWord(currentTextWord, currentTag)) {
                    if (symbolTableWordId[currentTextWord] == undefined || symbolTableWordId[currentTextWord] == null) {
                        symbolTableWordId[currentTextWord] = uniqueId;
                        symbolTableIdWord[uniqueId] = currentTextWord;
                        countWords[uniqueId] = 1;
                        uniqueId += 1;
                    }
                    else {
                        countWords[symbolTableWordId[currentTextWord]] += 1;
                    }

                    currentWordId = symbolTableWordId[currentTextWord];

                    if (wordBelongingSentenceTermCounts[currentWordId] == undefined || wordBelongingSentenceTermCounts[currentWordId] == null) {
                        //a sentence with this word has not been encountered earlier;
                        wordBelongingSentenceTermCounts[currentWordId] = sentenceWordCount;
                    }
                    else {
                        wordBelongingSentenceTermCounts[currentWordId] += sentenceWordCount;
                    }

                    if (sentenceWordIds[currentWordId] == undefined || sentenceWordIds[currentWordId] == null) {
                        //record unique words in this sentence to create pairs
                        sentenceWordIds[currentWordId] = currentWordId;
                    }

                    totalWordCount += 1;
                }
            }

            //create unique pairs and their counts 
            for (firstPair in sentenceWordIds) {
                for (secondPair in sentenceWordIds) {
                    if (firstPair != secondPair) {
                        pairHash = this.computePairHash(firstPair, secondPair);
                        if (pairHashCounts[pairHash] != null || pairHashCounts[pairHash] != undefined) {
                            pairHashCounts[pairHash] += 1;
                        }
                        else {
                            pairHashCounts[pairHash] = 1;
                        }
                    }
                }
            }
        }

        for (wordIdx in countWords) {
            sortedCountWords.push([wordIdx, countWords[wordIdx]]);
        }

        //this will sort them in descending order
        sortedCountWords.sort(function (a, b) { return b[1] - a[1] });
        var retIdx = 0;
        for (var wordIdx in sortedCountWords) {
            if (retIdx >= returnWordCount) {
                break;
            }
            retIdx++;
            var currentRetWord = symbolTableIdWord[sortedCountWords[wordIdx][0]];
            try {
                var stemmedWord = natural.PortStemmer.stem(currentRetWord);
            }
            catch (err) { }
            if (stemmedWord != undefined && stemmedWord != null && stemmedWord != currentRetWord) {
                returnWords.push(stemmedWord);
            }

            if (currentRetWord != undefined && currentRetWord != null) {
                returnWords.push(currentRetWord.toLowerCase());
            }
        }

        this.frequencyWordsPrint(frequencyWordCountPercentage, sortedCountWords, symbolTableIdWord, totalWordCount);

        //this is the helper method that applies actual chi square logic
        var sortedChiSquareValues = this.computeChiSquareValues(sortedCountWords, symbolTableIdWord, pairHashCounts, wordBelongingSentenceTermCounts, countThreshold, wordConsiderationPercentage);


        var retIdx = 0;
        for (var wordIdx in sortedChiSquareValues) {
            if (retIdx >= returnWordCount) {
                break;
            }
            retIdx++;
            if (sortedChiSquareValues[retIdx] == undefined)
                continue;

            currentRetWord = sortedChiSquareValues[retIdx][0];
            try {
                stemmedWord = natural.PortStemmer.stem(currentRetWord);
            }
            catch (err) { }
            if (stemmedWord != undefined && stemmedWord != null && stemmedWord != currentRetWord) {
                returnWords.push(stemmedWord);
            }

            if (currentRetWord != undefined && currentRetWord != null) {
                if(that.isValidWord(currentRetWord)) {
                    returnWords.push(currentRetWord.toLowerCase());
                }
            }
        }
    }
    finally {
        //this.utility.pop('analyze text', id);
        callback(null, returnWords, options);
    }
};

/****************************************************************************************************************************************************
The method does the actual chi square computation
****************************************************************************************************************************************************/
KeywordInference.prototype.computeChiSquareValues = function (sortedCountWords, symbolTableIdWord, pairHashCounts, wordBelongingSentenceTermCounts, countThreshold, wordConsiderationPercentage) {
    var id = -1;
    try {
        // id = this.utility.push('ChiSquare Values');
        var gWordIdx = 0;
        var gIdx = 0;
        var widx = 0 - countThreshold;
        var wThresholdCount = wordConsiderationPercentage * sortedCountWords.length / 100;
        var summationTermPergValue = 0;
        var chiSquareWords = {};
        var maxChiSquare = 0;
        var sortedChiSquareValues = [];
        var wordIdx = 0;

        for (var wordIdx in sortedCountWords) {
            if (widx > 0 && widx < wThresholdCount) {
                gIdx = 0;
                summationTermPergValue = 0;
                for (var gWordIdx in sortedCountWords) {
                    if (gIdx > countThreshold && (gWordIdx != wordIdx)) {
                        //done with all frequent words
                        firstPair = sortedCountWords[gWordIdx][0];
                        secondPair = sortedCountWords[wordIdx][0];
                        pairHash = this.computePairHash(firstPair, secondPair);
                        if (pairHashCounts[pairHash] != undefined) {
                            var nwpg = wordBelongingSentenceTermCounts[firstPair] * wordBelongingSentenceTermCounts[secondPair];
                            if (nwpg != undefined) {
                                var offsetActualExpectedValue = pairHashCounts[pairHash] - nwpg;
                                summationTermPergValue = summationTermPergValue + ((offsetActualExpectedValue * offsetActualExpectedValue) / nwpg);
                            }
                        }
                    }

                    gIdx += 1;
                }
            }
            else if (widx >= wThresholdCount) {
                break;
            }
            widx += 1;
            chiSquareWords[wordIdx] = summationTermPergValue;
            if (summationTermPergValue > maxChiSquare) {
                maxChiSquare = summationTermPergValue;
            }
        }

        for (wordIdx in chiSquareWords) {
            sortedChiSquareValues.push([symbolTableIdWord[wordIdx], chiSquareWords[wordIdx] - maxChiSquare]);
        }

        //this will sort them in descending order
        sortedChiSquareValues.sort(function (a, b) { return b[1] - a[1] });
        return sortedChiSquareValues;
    }
    finally {
        //this.utility.pop('ChiSquare Values', id);
    }
};

//this is not a blank class methods are added at locations where they are appropriate
exports.KeywordInference = KeywordInference;
