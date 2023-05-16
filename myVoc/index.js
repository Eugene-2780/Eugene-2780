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
app.use(express.static(path.join(__dirname, 'public')));

const { isNullOrUndefined } = require('util');

function CUR_FILEPATH(prefix = "") {
    return __dirname + "/data/" + prefix + "myDictionary.json";
}

function Clone(src) {
    return JSON.parse(JSON.stringify(src)); //deep copy
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
    if(dic != null){
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
    res.sendFile(__dirname + "/html/" + "index.html");
});
app.get('/dic_add', function (req, res) {
    res.sendFile(__dirname + "/html/" + "dic_add.html");
});

app.get('/dic_edit', function (req, res) {
    res.sendFile(__dirname + "/html/" + "dic_edit.html");
});

app.post('/dic_add', (req, res) => {

    console.log('/dic_add');

    fs.readFile(CUR_FILEPATH(), 'utf8', function (err, ddd) {

        var data = JSON.parse(ddd);
        var dic = data.dic;
        var cmd = req.body.button;

        var en = req.body.en;
        var ru = req.body.ru;
        var cat = req.body.cat;

        console.log(req.body);

        if (cmd == "Read") {

            var result = [];
            for (var i = 0; i < dic.length; i++) {
                var rec = dic[i];

                if (en.length == 0 || rec.en.indexOf(en) == 0)
                    result.push(rec);
            }

            if (bHtml) {
                var html = ConvertToHTML(result);
                res.end(html);
            }
            else {
                res.end(Response("OK", "Filtered", result));
            }

            return;
        }
        else if (cmd == "Add") {

            var bok = dicAdd(res, dic, en, ru, cat);
            if (bok) {
                //Replace current file with new assignment
                var sdata = JSON.stringify(data, null, 3);
                fs.writeFileSync(CUR_FILEPATH(), sdata);

                if (bHtml) {
                    var html = ConvertToHTML(dic);
                    res.end(html);
                }
                else {
                    res.end(Response("OK", "Added", dic));
                }


            }
        }
    });
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

app.post('/dic_edit', (req, res) => {

    console.log('/dic_edit');

    fs.readFile(CUR_FILEPATH(), 'utf8', function (err, ddd) {

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
                if(en==null || en.length == 0){
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
                fs.writeFileSync(CUR_FILEPATH(), sdata);

                res.end(Response("OK", "Edited", dic));
            }
                break;
            case "Add": {
                var bok = dicAdd(res, dic, en, ru, cat);
                if (bok) {
                    //Replace current file with new assignment
                    var sdata = JSON.stringify(data, null, 3);
                    fs.writeFileSync(CUR_FILEPATH(), sdata);

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
    console.log(`My dic is starting on port ${port}`)
})