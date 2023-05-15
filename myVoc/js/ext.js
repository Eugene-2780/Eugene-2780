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
    var row = "<tr  id=\"" + 'ROW' + nIndex + "\" >";
    // var td = "<td>" + (nIndex) + "</td>";
    var td = "<td><input type='radio' id='RADIO" + nIndex + "' name='group' value='" + nIndex + "' >" + nIndex + "</td>";
    row = row.concat(td);
    td = "<td id=\"" + 'E' + nIndex + "\" >" + rec.en + "</td>";
    row = row.concat(td);
    td = "<td id=\"" + 'R' + nIndex + "\" >" + rec.ru + "</td>";
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

