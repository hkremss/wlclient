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
  // put the event target into the editButton data to use it later
  document.getElementById('cmdEdit').dataset.cmdButtonId = event.target.id;
  document.getElementById('cmdRemove').dataset.cmdButtonId = event.target.id;
  document.getElementById('cmdAdd1').dataset.cmdButtonId = event.target.id;
  document.getElementById('cmdAdd4').dataset.cmdButtonId = event.target.id;
  // open the context menu
  var ctxMenu = document.getElementById('cmdButtonsCtxMenu');
  ctxMenu.style.left = (event.pageX - 150)+"px";
  ctxMenu.style.top = (event.pageY - 40)+"px";
  ctxMenu.classList.toggle('dropshow');
  event.preventDefault();
}

function settingsButtonContextFunction(event) {
  // put the event target into the editButton data to use it later
  document.getElementById('settingsAdd1').dataset.cmdButtonId = event.target.id;
  document.getElementById('settingsAdd4').dataset.cmdButtonId = event.target.id;
  // open the context menu
  var ctxMenu = document.getElementById('settingsButtonsCtxMenu');
  ctxMenu.style.left = (event.pageX - 150)+"px";
  ctxMenu.style.top = (event.pageY - 40)+"px";
  ctxMenu.classList.toggle('dropshow');
  event.preventDefault();
}

function closeAllButtonContextFunction() {
  document.getElementById('cmdButtonsCtxMenu').classList.remove('dropshow');
  document.getElementById('settingsButtonsCtxMenu').classList.remove('dropshow');
}
