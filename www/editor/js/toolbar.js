"use strict";

// see: view-source:https://jqueryui.com/resources/demos/controlgroup/toolbar.html

$( function() {

  // Redo button
  $( "#connectionStatus" ).button({
    "icon": "ui-icon-heart",
    "showLabel": false
  });
  $( "#connectionStatus" ).on("click", 
    function() {
     // from handle_gmcp.js
     if (!isClientConnected()) tryBringClientToFront();
    }
  );

  // New button
  $( "#new" ).on("click", 
    function() {
     $( "#messageDialog" ).dialog( "option", "title", "News..." );
     $( "#messageDialog" ).html( "Not implemented yet!" );
     $( "#messageDialog" ).dialog( "open" );
    }
  );

  // Open button
  $( "#open" ).on("click", 
    function() {
     $( "#messageDialog" ).dialog( "option", "title", "Open..." );
     $( "#messageDialog" ).html( "Not implemented yet!" );
     $( "#messageDialog" ).dialog( "open" );
    }
  );

  // Save button
  $( "#save" ).on("click", 
    function() {
      transferActiveTabFileToServer();
      var cm = getActiveTabCM();
      if (cm) cm.focus();
    }
  );

  // Save as... button
  $( "#saveas" ).on("click", 
    function() {
     $( "#messageDialog" ).dialog( "option", "title", "Save as..." );
     $( "#messageDialog" ).html( "Not implemented yet!" );
     $( "#messageDialog" ).dialog( "open" );
    }
  );

  // Redo button
  $( "#redo" ).button({
    "icon": "ui-icon-arrowreturnthick-1-e",
    "showLabel": false
  });
  $( "#redo" ).on("click",
    function() {
      var activeTab = document.querySelector("#tabs div.ui-tabs-panel[aria-hidden='false']");
      if (activeTab) {
        var cmEditor = activeTab.children[0].CodeMirror;
        cmEditor.getDoc().redo();
        cmEditor.focus();
      }
    }
  );

  // Undo button
  $( "#undo" ).button({
    "icon": "ui-icon-arrowreturnthick-1-w",
    "showLabel": false
  });
  $( "#undo" ).on("click",
    function() {
      var activeTab = document.querySelector("#tabs div.ui-tabs-panel[aria-hidden='false']");
      if (activeTab) {
        var cmEditor = activeTab.children[0].CodeMirror;
        cmEditor.getDoc().undo();
        cmEditor.focus();
      }
    }
  );

  ///////// garbage below //////////

  var page = $( "#page" );
  var basicControls = [ "#print", "#bold", "#italic", "#undo", "#redo" ];
  var valueControls = [ "#fontsize", "#forecolor", "#hilitecolor", "#backcolor", "fontname" ];

  $( ".toolbar" ).controlgroup();
  $( "#zoom" ).on( "selectmenuchange", function() {
    page.css({ "zoom": $( this ).val() });
  })
  $( basicControls.concat( valueControls ).join( ", " ) ).on( "click change selectmenuchange",
    function() {
      document.execCommand(
        this.id,
        false,
        $( this ).val()
    );
  } );
  $( "form" ).on( "submit", function( event ) {
    event.preventDefault();
  });
} );

