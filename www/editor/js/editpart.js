// Part of document body to handle storage events

function refresh_editpart() {

  var path = localStorage.getItem('WL.File.Transfer path');
  var content = localStorage.getItem('WL.File.Transfer content');

  // from messagelist.js
  if (path && content) {
    log_message("Received WL.File.Transfer of: " + path);
    $('div#fragment-1').text(content);
//    $('a#ui-id-1').span.text(path); 
  }

/*
  $('ul#fileslist').empty();

  if (list.length > 0) {
    var fileList = JSON.parse(list);

    // sort by name
    fileList.sort(function(a, b){ return a[0] > b[0] });

    if (fileList.length > 0) {
      for (var i = 0; i < fileList.length; i++)
      {
        var il = document.createElement('li');
        il.class='ui-widget-content';
        il.appendChild(document.createTextNode(fileList[i][0]));
        $('ul#fileslist').append(il);
      }
    }
  }
*/
}
