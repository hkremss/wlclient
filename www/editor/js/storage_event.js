// Part of document body to handle storage events
var handle_storage = function (event) {
  console.log("STORAGE EVENT: " + event.key);
  // file list received  
  if (/^WL\.File\.List list/.test(event.key)) refresh_filetree();
  // file has been transferred
  if (/^WL\.File\.Transfer path/.test(event.key)) refresh_editpart();
};

// react on storage events
window.addEventListener('storage', handle_storage, false);
