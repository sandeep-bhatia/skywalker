CodeMarker = function () {
    this.nextId = 0;
    this.elements = {};
}

CodeMarker.prototype.IsEmpty = function () {
    if (this.elements.length == 0) {
        return true;
    }

    return false;
}

CodeMarker.prototype.Push = function (marker) {
    var time = new Date();
    var id = this.nextId;

    this.elements[this.nextId] = { identifier: marker, start: time };
    if (this.nextId == Number.MAX_VALUE) {
        this.nextId = 0;
    }
    else {
        this.nextId++;
    }

    return id;
}

CodeMarker.prototype.Pop = function (marker, id) {
    var end = new Date();
    var start = this.elements[id];

    if (start != undefined && start != null) {
        return end - start['start'];
    }

    return null;
}

//the constructor for data gatherer this accepts the host, port and the callback on connection
Utility = function (logger, perf) {
    if (this.that != undefined && this.that != null) {
        return this.that;
    }
    else {
        this.enabled = false;
        this.that = this;
        this.codeMarker = new CodeMarker();
        this.logger = logger;
    }
}

Utility.prototype.push = function (marker) {
    var id = this.codeMarker.Push(marker);
    return id;
}

Utility.prototype.pop = function (marker, id) {
    var difference = this.codeMarker.Pop(marker, id);
    if (difference > 1000) {
        this.logger.log('warn',  marker + ':' + difference);
    }
    else {
        this.logger.log('info',  marker + ':' + difference);
    }
    return difference;
}

Utility.prototype.isTracingEnabled = function () {
    return this.enabled;
}

Utility.prototype.isValidUrl = function (sourceUrl, barredRecommendations, url) {
    //console.log("checking url " + url);
    if(url) {

        if(sourceUrl.toUpperCase().trim() == url.toUpperCase().trim()) {
            return false;
        }

        if(barredRecommendations != null) {
            for (var index = 0; index < barredRecommendations.length; index++) {
                if (url.toLowerCase().indexOf(barredRecommendations[index]) >= 0) {
                    return false;
                }
            }
        }

        var lastIndexDot = url.lastIndexOf('.');

        if(lastIndexDot == -1) return false;
        var extension = url.toLowerCase().trim().substring(lastIndexDot + 1);

        var extensions = ["arpa","biz","cat","com","coop","edu","firm","gov","info","int","jobs","mil","mobi","museum","name","nato","net","org","pro","store","travel","web","ac","ad","ae","af","ag","ai","al","am","an","ao","aq","ar","as","at","au","aw","az","ax","ba","bb","bd","be","bf","bg","bh","bi","bj","bm","bn","bo","br","bs","bt","bv","bw","by","bz","ca","cc","cd","cf","cg","ch","ci","ck","cl","cm","cn","co","cr","cs","cu","cv","cx","cy","cz","de","dj","dk","dm","do","dz","ec","ee","eg","eh","er","es","et","eu","fi","fj","fk","fm","fo","fr","ga","gb","gd","ge","gf","gg","gh","gi","gl","gm","gn","gp","gq","gr","gs","gt","gu","gw","gy","hk","hm","hn","hr","ht","hu","id","ie","il","im","in","io","iq","ir","is","it","je","jm","jo","jp","ke","kg","kh","ki","km","kn","kp","kr","kw","ky","kz","la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly","ma","mc","md","mg","mh","mk","ml","mm","mn","mo","mp","mq","mr","ms","mt","mu","mv","mw","mx","my","mz","na","nc","ne","nf","ng","ni","nl","no","np","nr","nu","nz","om","pa","pe","pf","pg","ph","pk","pl","pm","pn","pr","ps","pt","pw","py","qa","re","ro","ru","rw","sa","sb","sc","sd","se","sg","sh","si","sj","sk","sl","sm","sn","so","sr","st","sv","sy","sz","tc","td","tf","tg","th","tj","tk","tl","tm","tn","to","tp","tr","tt","tv","tw","tz","ua","ug","uk","um","us","uy","uz","va","vc","ve","vg","vi","vn","vu","wf","ws","ye","yt","yu","za","zm","zw"];
        if(extensions.indexOf(extension) >= 0) {
            return false;
        }

        return true;
    }

    return false;
}

Utility.prototype.getUser = function (req) {
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        cookies[parts[0].trim()] = (parts[1] || '').trim();
    });

    if (cookies['loggedId'] == undefined || cookies['loggedId'].length == 0) {
        return null;
    }

    return cookies['loggedId'];
}

Utility.prototype.enableTracing = function () {
    global.traceObject = this;
    this.enabled = true;
};

Utility.prototype.setSession = function (id, request) {
    var session = request.session;
    session.loggedId = id;
}

Utility.prototype.trace = function () { };
Utility.prototype.traceCollection = function () { };
exports.Utility = Utility;
