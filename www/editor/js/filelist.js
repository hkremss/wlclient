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
          SendGMCP_WL_File_List(currentPath + "/" + path + "/*");
          log_message( "file '" + path + "' selected.");
        }
      });
    }
  });
} );

var currentPath = '';

function refresh_filetree() {

  var path = localStorage.getItem('WL.File.List path');
  var list = localStorage.getItem('WL.File.List list');

  var currentFilename = path.replace(/^.*[\\\/]/, '');
  currentPath = path.substring(0, (path.length-currentFilename.length)-1);

  // from messagelist.js
  log_message("Received WL.File.List update for: " + path);

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
}
