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
const THEMES_FOLDER = __dirname + "/Themes/";
const SUBJECTS_FOLDER = __dirname + "/Subjects/";


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

function dicAdd(res, dic, inRec) {
    var en = inRec.en;
    var ru = inRec.ru;
    var cat = inRec.cat;

    if (en == null || en == undefined || en.length == 0) {
        res.end(Response("Error", "English is missing", null));
        return false;
    }

    //Look for a complex value
    const delimiter = "\t";
    var pos = inRec.en.indexOf(delimiter);
    var bComplex = pos != -1;
    if (bComplex) {
        en = inRec.en.substr(0, pos);
        ru = inRec.en.slice(pos + 1, inRec.en.length);
    }
    else {
        if (ru == null || ru == undefined || ru.length == 0) {
            res.end(Response("Error", "Russian is missing", null));
            return false;
        }
    }

    en.trim();
    ru.trim();
    inRec.en = en;
    inRec.ru = ru;
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
app.get('/vocab', function (req, res) {
    res.sendFile(HTML_FOLDER + "vocab.html");
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

function HTMLBegin() {
    var html = "<HTML>\n<BODY>\n<TABLE style=\"width:100%\" border=1 >\n";

    var th =
        "<tr>" +
        "<th width='10%'>Index</th>" +
        "<th width='15%'>English  </th>" +
        "<th>Sentence </th>" +
        "</tr>";
    html = html.concat(th);
    return html;
}

function HTMLAddRow(rec, nIndex, bRuVisible, bEnVisible) {
    var row = "<tr  id=\"" + 'ROW' + nIndex + "\" >";
    var td = "<td>" + nIndex + "</td>";
    row = row.concat(td);
    if (bEnVisible) {
        td = "<td id=\"" + 'E' + nIndex + "\" >" + rec.en + "</td>";
    }
    else {
        td = "<td id=\"" + 'E' + nIndex + "\" >" + "</td>";
    }
    row = row.concat(td);
    if (bRuVisible) {
        td = "<td id=\"" + 'R' + nIndex + "\" >" + rec.ru + "</td>";
    }
    else {
        td = "<td id=\"" + 'R' + nIndex + "\" >" + "</td>";
    }
    row = row.concat(td);
    row = row.concat("</tr>");
    return row;
}

function HTMLEnd() {
    return ("\n</TABLE>\n</BODY>\n</HTML>");
}

//Convert to html grid
function ConvertToHTML(result) {
    var bRuVisible = true;
    var bEnVisible = true;
    var html = HTMLBegin();
    var nIndex = 1;
    for (var j = 0; j < result.length; j++) {
        var rec = result[j];
        var row = HTMLAddRow(rec, nIndex, bRuVisible, bEnVisible);
        html = html.concat(row);
        nIndex++;
    }
    html = html.concat(HTMLEnd());
    return html;
}

function HandleFiles(dir, dic) {
    var files = fs.readdirSync(dir);

    files.forEach(file => {
        var pathname = dir + "/" + file;
        if (fs.lstatSync(pathname).isDirectory()) {
        }
        else {
            var rec = { "en": "", "ru": "" };
            //var bmp3 = file.indexOf(".mp3") != -1;
            var bmp3 = path.extname(file) == ".mp3";
            if (bmp3) {
                var file_title = file.replace(".mp3", "");
                rec.en = file_title;
                rec.ru = ""; //Sentence

                var file_txt = file.replace("mp3", "txt");
                var file_txt_path = dir + "/" + file_txt;
                if (fs.existsSync(file_txt_path)) {
                    var data = fs.readFileSync(file_txt_path);
                    rec.ru = data;
                }

                dic.push(rec);
            }
        }
    })
}

function CollectTopics(dir, dic) {
    var files = fs.readdirSync(dir);

    files.forEach(file => {
        var pathname = dir + "/" + file;
        if (fs.lstatSync(pathname).isDirectory()) {
            dic.push(file);
        }
    })
}

function LogParams(req, cap) {
    var s =
        "req.body  : " + JSON.stringify(req.body, null, 3) + "\n" +
        "req.query : " + JSON.stringify(req.query, null, 3) + "\n" +
        "req.params: " + JSON.stringify(req.params, null, 3);
    console.log("== " + cap + " ==\n" + s);
}

//function readFiles
app.get('/Themes', function (req, res) {

    LogParams(req, "Themes");

    var cmd = req.query.cmd;

    switch (cmd) {
        case "Read_topic":
            {
                var topic = req.query.topic;

                if (topic == null || topic.length == 0) {
                    return res.end(Response("FAIL", "Topic field is empty", null));
                }
                var filePath = THEMES_FOLDER + topic;
                if (!fs.existsSync(filePath)) {
                    return res.end(Response("FAIL", "Topic not found ==> " + filePath, null));
                }
                var dic = [];
                HandleFiles(filePath, dic);
                var html = ConvertToHTML(dic);

                return res.end(Response("HTML", "Files", html));
            }
            break;
        case "Read_all_topics":
            {
                var dic = [];
                var filePath = THEMES_FOLDER;
                CollectTopics(filePath, dic);
                return res.end(Response("TOPICS", "Folders", dic));
            }
            break;
        case "Read_file":
            {
                var filename = req.query.filename;

                if (filename == null || filename.length == 0) {
                    return res.end(Response("FAIL", "File name field is empty", null));
                }
                var filePath = THEMES_FOLDER + filename;
                if (!fs.existsSync(filePath)) {
                    return res.end(Response("FAIL", "File not found ==> " + filePath, null));
                }
                return res.sendFile(filePath);
            }
            break;
        default:
            break;
    }

    return res.end(Response("FAIL", "Wrong command ==> " + cmd, null));
})

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
                var o = { "en": "", "ru": "", "cat": "", "sub": "" };
                o.en = en;
                o.ru = ru;
                o.cat = cat;
                var bok = dicAdd(res, dic, o);
                if (bok) {
                    //Save in file
                    var sdata = JSON.stringify(data, null, 3);
                    fs.writeFileSync(DIC_FILEPATH(), sdata);

                    var result = Filter(dic, "", "", o.cat);
                    res.end(Response("OK", "Added", result));
                }
            }
                break;
            default:
                break;
        }
    });

});

function ConvertJSON(text, bRuVisible, bEnVisible) {
    let str = text;
    var dic = [];
    var nIndexStart = 0;
    var nIndexEnd = -1;

    while ((nIndexEnd = text.indexOf("\r\n", nIndexStart)) >= 0) {
        var o = { "en": "", "ru": "", "cat": "" };

        nStart = nIndexStart;
        let nEnd = str.indexOf("\t", nStart);
        let en_ = str.slice(nStart, nEnd);
        let en = en_.toString();
        if (bEnVisible){
            o.en = en;
        }

        nStart = nEnd + 1; nEnd = nIndexEnd;
        let ru_ = text.slice(nStart, nEnd);
        let ru = ru_.toString();
        if (bRuVisible){
            o.ru = ru;
        }
        else {
            o.ru = "";
        }

        dic.push(o);

        nIndexStart = nIndexEnd + 2;
    }
    return dic;
}

app.get('/Subjects', function (req, res) {

    LogParams(req, "Subjects");

    var cmd = req.query.cmd;

    switch (cmd) {
        case "Read_file":
            {
                var filename = req.query.filename;

                if (filename == null || filename.length == 0) {
                    return res.end(Response("FAIL", "File name field is empty", null));
                }
                var filePath = SUBJECTS_FOLDER + filename;
                if (!fs.existsSync(filePath)) {
                    return res.end(Response("FAIL", "File not found ==> " + filePath, null));
                }
                return res.sendFile(filePath);
            }
            break;
        case "Read_all_topics": // Browse all folders
            {
                var dic = [];
                var filePath = SUBJECTS_FOLDER;
                CollectTopics(filePath, dic);
                return res.end(Response("SUBJECTS", "Folders", dic));
            }
            break;
        case "Read_topic":
            {
                var topic = req.query.topic;

                if (topic == null || topic.length == 0) {
                    return res.end(Response("FAIL", "Topic field is empty", null));
                }
                var filePath = SUBJECTS_FOLDER + topic + "/" + topic + ".txt";
                if (!fs.existsSync(filePath)) {
                    return res.end(Response("FAIL", "Topic not found ==> " + filePath, null));
                }
                var data = fs.readFileSync(filePath);

                const bRuVisible = (req.query.bRuVisible == "true");
                const bEnVisible = (req.query.bEnVisible == "true");

                var dic = ConvertJSON(data, bRuVisible, bEnVisible);
                var html = ConvertToHTML(dic);

                return res.end(Response("HTML", "Files", html));
            }
            break;
        default:
            break;
    }

    return res.end(Response("FAIL", "Wrong command ==> " + cmd, null));
})

app.listen(port, () => {
    console.log(`My vocabulary is starting on port ${port}`)
})
