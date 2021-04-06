// Part of document body to handle message/log list


function log_message(msg) {

  $('div#messages').append( "<span style=\"display: block;\">" + new Date().toJSON() + ": "+msg + "</span>");
  $("div#messages").scrollTop($("div#messages")[0].scrollHeight);

}
