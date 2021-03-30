// Part of document body to handle storage events
var handle_storage = function (event) {
  console.log("STORAGE EVENT: " + event.key);
  refresh_filetree();
};

// refresh after storage event
window.addEventListener('storage', handle_storage, false);

// refresh after page load
$(document).ready(function(){ 
  refresh_filetree(); 
});
