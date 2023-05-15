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
    var rsp = { "Status": "", "Note": "", "Count": "", "dic": [] };
    rsp.Status = status;
    rsp.Note = note;
    rsp.Count = dic.length;
    rsp.dic = dic;
    rsp = JSON.stringify(rsp, null, 3);
    return rsp;
}


function dicAdd(res, dic, en_, ru_, cat) {
    var en = en_;
    var ru = ru_;

    if (en == null || en == undefined || en.length == 0) {
        res.end(Response("Error", "English is missing", dic));
        return false;
    }

    //Look for a complex value
    const delimiter = "\t";
    var pos = en_.indexOf(delimiter);
    var bComplex = pos != -1;
    if (bComplex) {
        //en_= en_.replace("\t", " ");
        en = en_.substr(0, pos);
        ru = en_.slice(pos+1, en_.length);
    }
    else {
        if (ru == null || ru == undefined || ru.length == 0) {
            res.end(Response("Error", "Russian is missing", dic));
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
        res.end(Response("Error", "Duplicate Keyword ==> '" + en +"'", rec));
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

function HTMLBegin() {
    var html = "<HTML>\n<BODY>\n<TABLE style=\"width:100%\" border=1 >\n";

    var th =
        "<tr>" +
        "<th>Index</th>" +
        "<th>English</th>" +
        "<th>Russian</th>" +
        "<th>Categoty</th>" +
        "</tr>";
    html = html.concat(th);
    return html;
}

function HTMLAddRow(rec, nIndex) {
    var row = "<tr>";
    var td = "<td>" + (nIndex) + "</td>";
    row = row.concat(td);
    // td = "<td onclick=\"c\">" + rec.en + "</td>";
    td = "<td id=\"TABLEDATA\" >" + rec.en + "</td>";
    row = row.concat(td);
    td = "<td>" + rec.ru + "</td>";
    row = row.concat(td);
    td = "<td>" + rec.cat + "</td>";
    row = row.concat(td);
    row = row.concat("</tr>");
    return row;
}

function HTMLEnd() {
    return ("\n</TABLE>\n</BODY>\n</HTML>");
}

//Convert to html grid
function ConvertToHTML(result) {
    var html = HTMLBegin();
    var nIndex = 1;
    for (var j = 0; j < result.length; j++) {
        var rec = result[j];
        var row = HTMLAddRow(rec, nIndex);
        html = html.concat(row);
        nIndex++;
    }
    html = html.concat(HTMLEnd());
    return html;
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
                
                if(en.length == 0 || rec.en.indexOf(en) == 0) 
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

function Filter(dic,en,ru,cat){
    var result = [];
    for (var i = 0; i < dic.length; i++) {
        var rec = dic[i];
        let bEn = en.length == 0 || rec.en.indexOf(en) == 0;
        let bCat = cat.length == 0 || rec.cat === cat;
        if(bEn && bCat) 
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

        if (cmd == "Read") {
            
            var result = Filter(dic,en,ru,cat);

            if (bHtml) {
                var html = ConvertToHTML(result);
                res.end(html);
            }
            else {
                res.end(Response("OK", "Filtered", result));
            }

            return;
        }
        else if (cmd == "Edit") {
            var rec = findRec(dic, en);

            //Already exists
            if(rec != null){
                rec.ru = ru;
                rec.cat = cat;
            }
        
            var bok = true;
            if (bok) {
                //Replace current file with new assignment
                var sdata = JSON.stringify(data, null, 3);
                fs.writeFileSync(CUR_FILEPATH(), sdata);

                if (bHtml) {
                    var html = ConvertToHTML(dic);
                    res.end(html);
                }
                else {
                    res.end(Response("OK", "Edited", dic));
                }


            }
        }
    });
});

app.listen(port, () => {
    console.log(`My dic is starting on port ${port}`)
})