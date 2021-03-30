// Part of document body to handle storage events

function refresh_filetree() {

  var path = localStorage.getItem('WL.File.List path');
  var list = localStorage.getItem('WL.File.List list');

  $('div#messages').text("Received WL.File.List update for: " + path);

  if (list.length > 0) {
    var fileList = JSON.parse(list);
    var divContent = '';

    if (fileList.length > 0) {
      divContent += '<table>';
      for (var i = 0; i < fileList.length; i++)
      {
        divContent += ('<tr><td>' + fileList[i][0] + '</td></tr>');
      }
      divContent += '</table>';
    }

    $('div#filetree').html(divContent);
  } else {
    $('div#filetree').html('');
  }
}
