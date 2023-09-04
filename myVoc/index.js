const express = require('express')
const app = express()
const port = 80

const path = require('path');
const bodyParser = require('body-parser')
const bHtml = false;

var fs = require("fs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const { isNullOrUndefined } = require('util');

const MP3_FOLDER = __dirname + "/mp3/";
const SUBJECTS_FOLDER = path.join(__dirname, "Subjects");

function FILE_PATH_JSON(topic) {
    let v = path.join(SUBJECTS_FOLDER, topic, topic + ".json");
    return v;
}

const _STATUS_WORD = "word";
const _STATUS_NOTE = "note";
const _STATE_HIDDEN = "hidden";
const _STATE_VISIBLE = "";
const _FILE_CONFIG = "config.json";

function CONFIG_FILEPATH() {
    return __dirname + "/" + _FILE_CONFIG;
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
        if (rsp.Status == "HTML") {
            rsp.Count = note;
        }
        else {
            rsp.Count = dic.length;
        }
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
    var o = { "en": en, "ru": ru, "cat": cat, "sub": "", "status": "", "state": "" };
    dic.push(o);
    return true;
}

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/index.html");
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

function HTMLBegin() {
    var html = "<HTML>\n<BODY>\n<TABLE style=\"width:100%\" border=1 >\n";

    var th =
        "<tr>" +
        "<th width='10%'>Index</th>" +
        "<th width='15%'>English  </th>" +
        "<th>Russian</th>" +
        "<th>Category</th>" +
        "<th>Status</th>" +
        "</tr>";
    html = html.concat(th);
    return html;
}

function HTMLAddRow(rec, nIndex, bRuVisible, bEnVisible) {

    var style = "", styleIndex = "";
    var nIndexWord = rec.status.indexOf(_STATUS_WORD);
    var nIndexNote = rec.status.indexOf(_STATUS_NOTE);
    var bHidden = rec.state == _STATE_HIDDEN;

    if (nIndexWord >= 0) {
        style += "color:Blue;"
    }
    if (nIndexNote >= 0) {
        style += "color:brown;"
    }

    var row = "<tr  id=\"" + 'ROW' + nIndex + "\" >";
    //Index
    var td = "<td width='5%' style='" + styleIndex + "' ><input type='radio' id='RADIO" + nIndex + "' name='group' value='" + nIndex + "' >" + nIndex + "</td>";
    row = row.concat(td);
    //English
    if (bEnVisible) {
        td = "<td id=\"" + 'E' + nIndex + "\" style=\"" + style + "\">" + rec.en + "</td>";
    }
    else {
        td = "<td id=\"" + 'E' + nIndex + "\" >" + "</td>";
    }
    row = row.concat(td);
    //Russian
    if (bRuVisible) {
        td = "<td id=\"" + 'R' + nIndex + "\"  > <p style=\"font-family:'Consolas' \">" + rec.ru + "</p></td>";
    }
    else {
        td = "<td id=\"" + 'R' + nIndex + "\"  >" + "</td>";
    }
    row = row.concat(td);
    //Category
    td = "<td  width='5%'>" + rec.cat + "</td>";
    row = row.concat(td);

    //Status
    td = "<td  width='5%' id=\"" + 'S' + nIndex + "\" >" + //rec.state +
        "<input type='checkbox' id='idHide" + nIndex + "' name='n' ";
    if (bHidden) {
        td += " checked   ";
    }
    td += " ></input>";

    "</td>";
    row = row.concat(td);

    row = row.concat("</tr>");
    return row;
}

function HTMLEnd() {
    return ("\n</TABLE>\n</BODY>\n</HTML>");
}

//Convert to html grid
function ConvertToHTML(result, bRuVisible, bEnVisible, bHidVisible) {
    var html = HTMLBegin();
    var nIndex = 1;
    for (var j = 0; j < result.length; j++) {
        var rec = result[j];

        if (bHidVisible || rec.state != _STATE_HIDDEN) {
            var row = HTMLAddRow(rec, nIndex, bRuVisible, bEnVisible);
            html = html.concat(row);
            nIndex++;
        }
    }
    html = html.concat(HTMLEnd());
    return html;
}

//Folder means topic
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

function Filter(dic, en, ru, cat) {
    var result = [];
    for (var i = 0; i < dic.length; i++) {
        var rec = dic[i];
        let bEn = en == undefined || en.length == 0 || rec.en.indexOf(en) == 0;
        let bCat = cat == undefined || cat.length == 0 || rec.cat === cat;
        if (bEn && bCat)
            result.push(rec);
    }
    return result;
}

function SearchWithFilter(dic, en, file) {
    var result = [];
    for (var i = 0; i < dic.length; i++) {
        var rec = dic[i];
        if (rec.en == undefined) {
            continue;
        }
        let bEn = en == undefined || en.length == 0 || rec.en.indexOf(en) == 0;
        if (bEn) {
            let empty = "";
            let ru = rec.ru + "";
            let pad_length = 45 - rec.ru.length;
            let pad = empty.padEnd(pad_length, ".");
            let rup = ru + pad; // to have real length
            let topic = file;
            rec.ru = "" + rup + "{" + topic + "";

            result.push(rec);
        }
    }
    return result;
}

function SearchTopics(dir, en) {
    var files = fs.readdirSync(dir);

    let dic = [];

    files.forEach(file => {
        var pathname = path.join(dir, file);
        if (fs.lstatSync(pathname).isDirectory()) {

            var filePathJson = FILE_PATH_JSON(file);
            if (fs.existsSync(filePathJson)) {
                var data = fs.readFileSync(filePathJson);
                var json = JSON.parse(data);
                var result = SearchWithFilter(json.dic, en, file);
                if (result.length > 0) {
                    dic = dic.concat(result);
                }
            }
        }
    })

    return dic;
}


//parse the string lines and convert to json
function ConvertJSON(text) {
    let str = text;
    var dic = [];
    var nIndexStart = 0;
    var nIndexEnd = -1;

    while ((nIndexEnd = text.indexOf("\r\n", nIndexStart)) >= 0) {
        var o = { "en": "", "ru": "", "cat": "", "status": "", "state": "" };

        nStart = nIndexStart;
        let nEnd = str.indexOf("\t", nStart);
        let en_ = str.slice(nStart, nEnd);
        let en = en_.toString();
        o.en = en;

        nStart = nEnd + 1; nEnd = nIndexEnd;
        let ru_ = text.slice(nStart, nEnd);
        let ru = ru_.toString();
        o.ru = ru;

        dic.push(o);

        nIndexStart = nIndexEnd + 2;
    }
    return dic;
}

//Mark if file exists
function applyMp3FileExists(dic) {
    var dir = MP3_FOLDER;

    dic.forEach(rec => {
        var pathname = dir + rec.en + ".mp3";
        var pathname_ = dir + rec.en + "--.mp3";
        if (fs.existsSync(pathname)) {
            rec.status += " " + _STATUS_WORD;
        }
        if (fs.existsSync(pathname_)) {
            rec.status += " " + _STATUS_NOTE;
        }
    });
}

function findItem(dic, en) {

    for (var i = 0; i < dic.length; i++) {
        var rec = dic[i];
        if (rec.en == en) {
            return rec;
        }
    }
    return null;
}

function updateConfig(hidden) {
    var json = fs.readFileSync(CONFIG_FILEPATH());
    json = JSON.parse(json);
    json.Hidden = hidden;
    var data = JSON.stringify(json, null, 3);
    fs.writeFileSync(CONFIG_FILEPATH(), data);
    return data;
}

app.get('/Subjects', function (req, res) {

    LogParams(req, "Subjects Get");

    var cmd = req.query.cmd;
    var enSearch = req.query.enSearch;

    switch (cmd) {
        case "Search":
            {
                var json = { "dic": [] };
                let result = SearchTopics(SUBJECTS_FOLDER, enSearch);
                result.sort((a, b) => {
                    const nameA = a.en.toUpperCase();
                    const nameB = b.en.toUpperCase();
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }
                    // names must be equal
                    return 0;
                });
                applyMp3FileExists(result);

                var html = ConvertToHTML(result, true, true, true);
                return res.end(Response("HTML", result.length, html));
           }
            break;
        case "Read_file":
            {
                var filename = req.query.filename;

                if (filename == null || filename.length == 0) {
                    return res.end(Response("FAIL", "File name field is empty", null));
                }
                var filePath = path.join(SUBJECTS_FOLDER, filename);
                if (!fs.existsSync(filePath)) {
                    return res.end(Response("FAIL", "File not found ==> " + filePath, null));
                }
                return res.sendFile(filePath);
            }
            break;
        case "Read_mp3_by_index":
            {
                var json = { "dic": [] };
                const index = req.query.index;
                const topic = req.query.topic;

                if (index == null || index < 0) {
                    return res.end(Response("FAIL", "Index is wrong", null));
                }
                var filePathJson = FILE_PATH_JSON(topic);

                if (!fs.existsSync(filePathJson)) {
                    return res.end(Response("FAIL", "File not found ==> " + filePathJson, null));
                }

                json = fs.readFileSync(filePathJson);
                json = JSON.parse(json);
                var filename = json.dic[index].en + ".mp3";
                var filePath = MP3_FOLDER + filename;
                return res.sendFile(filePath);
            }
            break;
        case "Read_mp3_file":
            {
                var filename = req.query.filename;

                if (filename == null || filename.length == 0) {
                    return res.end(Response("FAIL", "File name field is empty", null));
                }
                var filePath = MP3_FOLDER + filename;
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
                const topic = req.query.topic;
                const cat = req.query.cat;
                const bRuVisible = (req.query.bRuVisible == "true");
                const bEnVisible = (req.query.bEnVisible == "true");
                const bHidVisible = (req.query.bHidVisible == "true");
                var json = { "dic": [] };
                //Check the topic
                if (topic == null || topic.length == 0) {
                    return res.end(Response("FAIL", "Topic field is empty", null));
                }

                var filePath = path.join(SUBJECTS_FOLDER, topic, topic, ".txt");
                //If json file is missing, then create json
                var filePathJson = FILE_PATH_JSON(topic);
                if (!fs.existsSync(filePathJson)) {
                    if (!fs.existsSync(filePath)) {
                        return res.end(Response("FAIL", "Topic not found ==> " + filePath, null));
                    }

                    var data = fs.readFileSync(filePath);
                    var dic = ConvertJSON(data);
                    json.dic = dic;
                    var ddd = JSON.stringify(json, null, 3);
                    fs.writeFileSync(filePathJson, ddd);
                }
                else {
                    json = fs.readFileSync(filePathJson);
                    json = JSON.parse(json);
                }

                applyMp3FileExists(json.dic);
                var result = Filter(json.dic, "", "", cat);

                var html = ConvertToHTML(result, bRuVisible, bEnVisible, bHidVisible);
                return res.end(Response("HTML", result.length, html));
            }
            break;
        default:
            break;
    }

    return res.end(Response("FAIL", "Wrong command ==> " + cmd, null));
})

function ToHTML(dic, category,) {
    var result = Filter(dic, "", "", category);
    applyMp3FileExists(result);
    return ConvertToHTML(result, true, true, true);
}

app.post('/Subjects', function (req, res) {

    LogParams(req, "Subjects Post");

    var cmd = req.body.cmd;

    switch (cmd) {
        case "HideItem": //show table row
        case "ShowItem":
            {
                const en = req.body.en;
                const bRuVisible = (req.body.bRuVisible == true);
                const bEnVisible = (req.body.bEnVisible == true);
                const bHidVisible = (req.body.bHidVisible == true);
                const topic = req.body.topic;
                var filePathJson = FILE_PATH_JSON(topic);

                if (!fs.existsSync(filePathJson)) {
                    return res.end(Response("FAIL", "File not found ==> " + filePathJson, null));
                }
                var json = fs.readFileSync(filePathJson);
                json = JSON.parse(json);
                var rec = findItem(json.dic, en);
                if (rec != null) {
                    rec.state = cmd == "HideItem" ? _STATE_HIDDEN : _STATE_VISIBLE;
                    var data = JSON.stringify(json, null, 3);
                    fs.writeFileSync(filePathJson, data);
                    json = JSON.parse(data);
                }

                applyMp3FileExists(json.dic);
                var html = ConvertToHTML(json.dic, bRuVisible, bEnVisible, bHidVisible);

                updateConfig(bHidVisible);

                return res.end(Response("HTML", json.dic.length, html));
            }
            break;
        case "GetConfig":
            {
                var filePath = CONFIG_FILEPATH();
                var config;
                if (!fs.existsSync(filePath)) {
                    config = { "Hidden": true };
                }
                else {
                    config = fs.readFileSync(filePath);
                    config = JSON.parse(config);
                }
                var dic = [];
                dic.push(config);
                return res.end(Response("CFG", "Note 1", dic));
            }
            break;
        case "PutConfig":
            {
                const bHidden = req.body.bHidVisible;
                updateConfig(bHidden);
                var dic = [];
                dic.push(config);
                return res.end(Response("CFG", "Note 2", dic));
            }
            break;
        case "Edit":
            {
                const en = req.body.en;
                const ru = req.body.ru;
                const cat = req.body.cat;
                const topic = req.body.topic;
                if (en == null || en.length == 0) {
                    res.end(Response("FAIL", "Empty English field", null));
                    return;
                }

                var filePathJson = FILE_PATH_JSON(topic);
                var data = fs.readFileSync(filePathJson);

                var json = JSON.parse(data);
                var dic = json.dic;
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
                var sdata = JSON.stringify(json, null, 3);
                fs.writeFileSync(filePathJson, sdata);

                var html = ToHTML(dic, cat);

                return res.end(Response("HTML", json.dic.length, html));
            }
            break;
        case "Add":
            {
                const en = req.body.en;
                const ru = req.body.ru;
                const cat = req.body.cat;
                const topic = req.body.topic;
                if (en == null || en.length == 0) {
                    res.end(Response("FAIL", "Empty English field", null));
                    return;
                }

                var filePathJson = FILE_PATH_JSON(topic);
                var data = fs.readFileSync(filePathJson);

                var json = JSON.parse(data);
                var dic = json.dic;

                var o = { "en": en, "ru": ru, "cat": cat, "sub": "", "status": "", "state": "" };
                var bok = dicAdd(res, dic, o);
                if (bok) {
                    //Save in file
                    var sdata = JSON.stringify(json, null, 3);
                    fs.writeFileSync(filePathJson, sdata);

                    var html = ToHTML(dic, cat);

                    return res.end(Response("HTML", json.dic.length, html));
                }
            }
            break;
        default:
            return res.end(Response("FAIL", "Wrong command ==> " + cmd, null));
            break;
    }

})


app.listen(port, () => {
    console.log(`My vocabulary is starting on port ${port}`)
})
