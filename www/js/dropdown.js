/* Modified dropdown (or drop-up) menu JS - see https://www.w3schools.com/howto/howto_js_dropdown.asp */

/* When called, toggle between hiding and showing the main dropdown */
function mainDropDownFunction() {
  var mainDropdown = document.getElementById('mainDropdown');

  // if the main dropdown is going to be closed, close ALL dropdowns
  if (mainDropdown.classList.contains('dropshow')) {
    closeAllDropDowns();
  }
  // otherwise just toggle the main dropdown visibility
  else {
    mainDropdown.classList.toggle('dropshow');
  }

  document.getElementById('cmd').focus();
}

/* When called, toggle between hiding and showing the settings dropdown */
function settingsDropDownFunction() {
  document.getElementById('settingsDropdown').classList.toggle('dropshow');
  document.getElementById('cmd').focus();
}

/* When called, all open dropdowns are closed immediately */
function closeAllDropDowns() {
  var dropdowns = document.getElementsByClassName('dropdown-content');
  var i;
  for (i = 0; i < dropdowns.length; i++) {
    var openDropdown = dropdowns[i];
    if (openDropdown.classList.contains('dropshow')) {
      openDropdown.classList.remove('dropshow');
    }
  }
}

// Close the dropdown if the user clicks outside of it
/*
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('dropshow')) {
        openDropdown.classList.remove('dropshow');
      }
    }
  }
}
*/
