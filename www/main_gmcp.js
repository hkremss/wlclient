// all the GMCP handling is done here!
//
// requires main.js
//

// New: GMCP support (Holger)
function getGMCPHello(){
  return 'Core.Hello { \"client\": \"WL@Web\", \"version\": \"1.0.1\" }';
}

// remember these values, if player dies and becomes alive again
var living_room_image = '';
var living_room_name = '';

// Debug flags
var debug_GMCP = false;

function doGMCPReceive(sock, data) {

  // Modify this line, if you need a different base URL
  // or leave it blank to use a pure relative path.
  var staticContentBase = '/webclient/';

  if(data.length>0) {

    // handle JSON data here and update UI!
    if(debug_GMCP) writeToScreen('GMCP: ' + data + '<br>');

    var module = data.split(' ', 1)[0];
    var payload = data.substr(module.length);
  
    if(module=='Core.Ping') {
      // This should be the response of our ping, so ignore it!
      return;
    }

    if(module=='Core.Goodbye') {
      // The server tells us, we will be disconnected now.
      var value = JSON.parse(payload);

      if(value!=0) {
        $('span#room_name').text(value);
      }

      $('img#room_image').attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
      $('img#room_image').attr('alt', 'Bildstoerung');
      $('a#room_image_a').attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
      $('a#room_image_a').attr('data-title', 'Bildstoerung');

      return;
    }

    if(module=='Char.Vitals') {
      var values = JSON.parse(payload);

      // if dead
      if('ghost' in values && values['ghost']=='1'){
        var img_a = $('a#room_image_a');
        var img = $('img#room_image');
        img.attr('src', staticContentBase + 'img/std/tod.jpg');
        img.attr('alt', 'DU BIST TOT!');
        img_a.attr('href', staticContentBase + 'img/std/tod.jpg');
        img_a.attr('data-title', 'DU BIST TOT!');
        $('span#room_name').text('DU BIST TOT!');
      }

      // if alive again
      if('ghost' in values && values['ghost']=='0'){
        var img_a = $('a#room_image_a');
        var img = $('img#room_image');
        if(living_room_image == '') {
          img.attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
          img.attr('alt', 'Bildstoerung');
          img_a.attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
          img_a.attr('data-title', 'Bildstoerung');
        }
        else {
          img.attr('src', staticContentBase + living_room_image);
          img.attr('alt', living_room_name);
          img_a.attr('href', staticContentBase + living_room_image);
          img_a.attr('data-title', living_room_name);
        }
        $('span#room_name').text(living_room_name);
      }

      // XP
      if('xp' in values){
        $('span#xp.info').text(numberWithDots(values['xp']));
      }

      // HP
      if('hp' in values){
        $('span#hp.info').text(values['hp']);
      }
      if('max_hp' in values){
        $('span#max_hp.info').text(values['max_hp']);
      }

      // SP
      if('sp' in values){
        $('span#sp.info').text(values['sp']);
      }
      if('max_sp' in values){
        $('span#max_sp.info').text(values['max_sp']);
      }

      // QP
      if('questpoints' in values){
        $('span#questpoints.info').text(values['questpoints']);
      }
      if('max_questpoints' in values){
        $('span#max_questpoints.info').text(values['max_questpoints']);
      }

      // Wimpy
      if('wimpy' in values){
        $('span#wimpy.info').text(values['wimpy']);
      }
      if('wimpy_dir' in values){
        if(values['wimpy_dir']=='' || values['wimpy_dir']=='0')
          $('span#wimpy_dir.info').text('keine');
        else
          $('span#wimpy_dir.info').text(values['wimpy_dir']);
      }

      // INT, STR, DEX, CON
      if('int' in values){
        $('span#int.info').text(values['int']);
      }
      if('str' in values){
        $('span#str.info').text(values['str']);
      }
      if('dex' in values){
        $('span#dex.info').text(values['dex']);
      }
      if('con' in values){
        $('span#con.info').text(values['con']);
      }
	  
	  return;
    }

    if(module=='Room.Info') {
      var values = JSON.parse(payload);

      // name
      if('name' in values){
        living_room_name = values['name'];
        $('span#room_name').text(living_room_name);
      }

      // image
      if('image' in values){
        living_room_image = values['image'];
        var img_a = $('a#room_image_a');
        var img = $('img#room_image');
        if(living_room_image == '') {
          img.attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
          img.attr('alt', 'Bildstoerung');
          img_a.attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
          img_a.attr('data-title', 'Bildstoerung');
        }
        else {
          img.attr('src', staticContentBase + living_room_image);
          img_a.attr('href', staticContentBase + living_room_image);
          if('name' in values) {
            img.attr('alt', living_room_name);
            img_a.attr('data-title', living_room_name);
          }
        }
      }
	  
	  return;
    }
  } 
}
