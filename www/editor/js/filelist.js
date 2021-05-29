// Part of document body to handle storage events

// table
(function ($) {
    $.fn.styleTable = function (options) {
        var defaults = {
            css: 'ui-styled-table'
        };
        options = $.extend(defaults, options);

        return this.each(function () {
            $this = $(this);
            $this.addClass(options.css);

            $this.on('mouseover mouseout', 'tbody tr', function (event) {
                $(this).children().toggleClass("ui-state-hover", event.type == 'mouseover');
            });

            $this.find("th").addClass("ui-state-default");
            $this.find("td").addClass("ui-widget-content");
            $this.find("tr:last-child").addClass("last-child");
        });
    };

    $("table#filetable").styleTable();
})(jQuery);

var currentPath = '';
var selectedEntry = '';

// list
$( function() {
  $( "ul#fileslist" ).selectable({
    stop: function() {
      var result = $( "#select-result" ).empty();
      $( ".ui-selected", this ).each(function() {
        var index = $( "ul#fileslist li" ).index( this );
        if (index>=0) {
          index++;
          // from messagelist.js
          var path = $( "ul#fileslist" ).find('li:nth-child('+index+')').text();
		  if (path == selectedEntry) {
            // if selected 'again', do something (kind of double click behavior)
			if (path.lastIndexOf('/') == -1) {
              // double click on a file
              SendGMCP_WL_File_Transfer(currentPath + "/" + path, 0); // it's a request
              log_message( "Open file: " + currentPath + "/" + path);
			} else {
              SendGMCP_WL_File_List(currentPath + "/" + path + "*");
              log_message( "Get file list for: " + currentPath + "/" + path);
			}
			selectedEntry = '';
		  } 
          else {
            // first selection
            selectedEntry = path;
            log_message( "Element '" + path + "' selected.");
          }
        }
      });
    }
  });
} );

function refresh_filetree() {
	
  var path = localStorage.getItem('WL.File.List path');
  var list = localStorage.getItem('WL.File.List list');

  if (path!=null) {
    var currentFilename = path.replace(/^.*[\\\/]/, '');
    currentPath = path.substring(0, (path.length-currentFilename.length)-1);
  }
  
  // from messagelist.js
  log_message("Received WL.File.List update for: " + path);

  $('ul#fileslist').empty();

  if (list != null && list.length > 0) {
    var fileList = JSON.parse(list);

    // sort by name
    fileList.sort(function(a, b){ return a[0] > b[0] });

    if (fileList.length > 0) {
      for (var i = 0; i < fileList.length; i++)
      {
        if (fileList[i][0] == '.') continue;
		if (fileList[i][0] == '..' && currentPath == "") continue;
        var il = document.createElement('li');
        il.class='ui-widget-content';
		if (fileList[i][1] >= 0) {
          il.appendChild(document.createTextNode(fileList[i][0]));
		} else {
          il.appendChild(document.createTextNode(fileList[i][0] + '/'));
		}
        $('ul#fileslist').append(il);
      }
    }
  }
}
