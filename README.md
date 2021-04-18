# WL-Client

WL-Client is a client for the German MUD (multi-user dungeon) [Wunderland](https://wunderland.mud.de/). It's based on the great [WebTelnet by Raymond Xie](https://github.com/mudchina/webtelnet) as a proxy server to bridge websocket to telnet, enable visiting telnet servers with browsers. It has been adapted, partially bug-fixed and extended as a special purpose tool. So if you are looking for a more generic approach, visit: https://github.com/mudchina/webtelnet

## Purpose

WL-Client can be used, to play Wunderland or other MUDs based on Wunderland Mudlib. Although it should be usable for any MUD, it makes heavy use of the [GMCP protocol](https://www.gammon.com.au/gmcp) and special GMCP modules only used by Wunderland.

## Install

Make sure, [NodeJS](https://nodejs.org) v10.x or up is installed. Clone the repository into your web project, e.g. /home/www/client.app/. Make sure, a browser request will reached the document root in /home/www/client.app/www/ through your static web-server host configuration. Finally launch the client like: 

```bash $ 
node /home/www/client.app/main.js 4716 4711 -h localhost -c iso-8859-1
```

* This will launch the client as a web site on: http://your-host:4716/client/ 
* Socket-connection will to the MUD will use port 4711 on localhost. 
* If your MUD is running on a different local port, change 4711. 
* You can configure https to make your client more secure. 
* You can use a reverse-proxy configuration to avoid custom ports and use 80/443.

## Screenshot

Playing MUD with PC browser (e.g. Chrome): 

![wlclient](https://github.com/hkremss/wlclient/raw/master/docs/wl.png) 

Playing MUD with mobile browser on Android: 

![wlclient-mobile](https://github.com/hkremss/wlclient/raw/master/docs/wl-mobile.png)

## Credits

Created by Raymond Xie, published under MIT license. 

Adapted, fixed and extended for Wunderland by Holger@Wunderland, Fuchur@Wunderland
