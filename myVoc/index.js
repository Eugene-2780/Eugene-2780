const express = require('express')
const app = express()
const port = 3000

const path = require('path');
const bodyParser = require('body-parser')
const bHtml = false;

var fs = require("fs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const { isNullOrUndefined } = require('util');

const MP3_FOLDER = __dirname + "/mp3/";
const HTML_FOLDER = __dirname + "/html/";
const DATA_FOLDER = __dirname + "/data/";
const MARVEL_FOLDER = __dirname + "/Marvel/";

function DIC_FILEPATH(prefix = "") {
    return DATA_FOLDER + prefix + "myDictionary.json";
}

function findRec(assocs, en) {
    var rec = null;
    for (var i = 0; i < assocs.length; i++) {
        var o = assocs[i];
        if (o.en === en) {
            rec = o;
            break;
        }
    }
    return rec;
}

function Response(status, note, dic) {
    var rsp = { "Status": "", "Note": "", "Count": "0", "dic": [] };
    rsp.Status = status;
    rsp.Note = note;
    if (dic != null) {
        rsp.Count = dic.length;
        rsp.dic = dic;
    }
    rsp = JSON.stringify(rsp, null, 3);
    return rsp;
}

function dicAdd(res, dic, en_, ru_, cat) {
    var en = en_;
    var ru = ru_;

    if (en == null || en == undefined || en.length == 0) {
        res.end(Response("Error", "English is missing", null));
        return false;
    }

    //Look for a complex value
    const delimiter = "\t";
    var pos = en_.indexOf(delimiter);
    var bComplex = pos != -1;
    if (bComplex) {
        //en_= en_.replace("\t", " ");
        en = en_.substr(0, pos);
        ru = en_.slice(pos + 1, en_.length);
    }
    else {
        if (ru == null || ru == undefined || ru.length == 0) {
            res.end(Response("Error", "Russian is missing", null));
            return false;
        }
    }

    en.trim();
    ru.trim();

    var rec = findRec(dic, en);

    //Already exists
    if (rec != null) {
        rec.ru = ru;
        rec.cat = cat;
        res.end(Response("Error", "Duplicate Keyword ==> '" + en + "'", rec));
        return false;
    }

    //New assoc
    var o = { "en": "", "ru": "", "cat": "g", "sub": "" };
    o.en = en;
    o.ru = ru;
    o.cat = cat;
    dic.push(o);
    return true;
}

app.get('/', function (req, res) {
    res.sendFile(HTML_FOLDER + "index.html");
});

/*
Returns file.mp3 to client
*/
app.get('/play', function (req, res) {
    var s = "req.query : " + JSON.stringify(req.query, null, 3) + "\n";
    console.log("Play ==> " + s);

    var en = req.query.en;
    if (en == null || en.length == 0) {
        return res.end(Response("FAIL", "English field is empty", null));
    }
    var file = en + ".mp3";

    var filePath = MP3_FOLDER + file;
    if (!fs.existsSync(filePath)) {
        return res.end(Response("FAIL", "File not found ==> " + file, null));
    }
    res.sendFile(filePath);
})

app.get('/Marvel', function (req, res) {
    var s = "req.query : " + JSON.stringify(req.query, null, 3) + "\n";
    console.log("Marvel ==> " + s);

    var filename = req.query.filename;
    if (filename == null || filename.length == 0) {
        return res.end(Response("FAIL", "File name field is empty", null));
    }
    var file = filename;

    var filePath = MARVEL_FOLDER + filename;
    if (!fs.existsSync(filePath)) {
        return res.end(Response("FAIL", "File not found ==> " + file, null));
    }
    res.sendFile(filePath);
})

app.get('/vocab', function (req, res) {
    res.sendFile(HTML_FOLDER + "vocab.html");
});
app.get('/marvel', function (req, res) {
    res.sendFile(HTML_FOLDER + "Marvel.html");
});

function Filter(dic, en, ru, cat) {
    var result = [];
    for (var i = 0; i < dic.length; i++) {
        var rec = dic[i];
        let bEn = en.length == 0 || rec.en.indexOf(en) == 0;
        let bCat = cat.length == 0 || rec.cat === cat;
        if (bEn && bCat)
            result.push(rec);
    }
    return result;
}

app.post('/vocab', (req, res) => {

    console.log('/vocab');

    fs.readFile(DIC_FILEPATH(), 'utf8', function (err, ddd) {

        var data = JSON.parse(ddd);
        var dic = data.dic;
        var cmd = req.body.button;

        var en = req.body.en;
        var ru = req.body.ru;
        var cat = req.body.cat;

        console.log(req.body);
        switch (cmd) {
            case "Read": {
                var result = Filter(dic, en, ru, cat);
                res.end(Response("OK", "Filtered", result));
                return;
            }
                break;
            case "Edit": {
                if (en == null || en.length == 0) {
                    res.end(Response("FAIL", "Empty English field", null));
                    return;
                }
                var rec = findRec(dic, en);
                if (rec == null) {
                    //Not found
                    var result = [];
                    res.end(Response("FAIL", "Not found", result));
                    return;
                }

                //Already exists
                if (rec != null) {
                    rec.ru = ru;
                    rec.cat = cat;
                }

                //Replace current file with new assignment
                var sdata = JSON.stringify(data, null, 3);
                fs.writeFileSync(DIC_FILEPATH(), sdata);

                res.end(Response("OK", "Edited", dic));
            }
                break;
            case "Add": {
                var bok = dicAdd(res, dic, en, ru, cat);
                if (bok) {
                    //Replace current file with new assignment
                    var sdata = JSON.stringify(data, null, 3);
                    fs.writeFileSync(DIC_FILEPATH(), sdata);

                    res.end(Response("OK", "Added", dic));
                }
            }
                break;
            default:
                break;
        }
    });

});

app.listen(port, () => {
    console.log(`My vocabulary is starting on port ${port}`)
})
