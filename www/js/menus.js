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

function cmdButtonContextFunction(event) {
  var ctxMenu = document.getElementById('cmdButtonsCtxMenu');
  ctxMenu.style.left = (event.pageX - 150)+"px";
  ctxMenu.style.top = (event.pageY - 10)+"px";
  ctxMenu.classList.toggle('dropshow');
  writeToScreen('Kontext-Menue! '+event+'\n');
  MicroModal.show('cmd1ButtonEditModalDlg', {'debugMode':true});
  event.preventDefault();
}

function closeCmdButtonContextFunction() {
  var ctxMenu = document.getElementById('cmdButtonsCtxMenu');
  ctxMenu.classList.remove('dropshow');
}
