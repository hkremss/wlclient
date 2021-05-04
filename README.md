# WL-Client

WL-Client is a client for the German MUD (multi-user dungeon) [Wunderland](https://wunderland.mud.de/). It's based on the great [WebTelnet by Raymond Xie](https://github.com/mudchina/webtelnet) as a proxy server to bridge websocket to telnet, enable visiting telnet servers with browsers. It has been adapted, bug-fixed, updated and extended as a special purpose tool. So if you are looking for a more generic approach, visit: https://github.com/mudchina/webtelnet

## Purpose

WL-Client can be used to play Wunderland or other MUDs based on Wunderland Mudlib. Although it should be usable for any MUD, it makes heavy use of the [GMCP protocol](https://www.gammon.com.au/gmcp) and special GMCP modules only used by Wunderland.

## Install

Make sure, [NodeJS](https://nodejs.org) v10.x or up is installed. Clone the repository into your web project, e.g. /home/www/client.app/. Execute *npm install* to get all dependencies. Launch the client like: 

```bash $ 
node /home/www/client.app/main.js 4716 4711 -h wl.mud.de -c iso-8859-1
```

* This will launch the client as a web site on your machine port 4716: http://localhost:4716/client/ 
* Socket-connection will to the MUD will use port 4711 on wl.mud.de (MUD Wunderland). 
* To test your MUD change 'wl.mud.de' and '4711' to your parameters.
* You can configure https to make your client more secure. 
* You can use a reverse-proxy configuration to avoid custom ports and use 80/443.
* For production mode: Make sure, the client browser request will reach static content on //<your-host>:<your-port>/webclient/ through your static web-server host configuration. 

## Screenshot

Playing Wunderland with PC browser (e.g. Chrome): 

![wlclient](https://github.com/hkremss/wlclient/raw/master/docs/wl.png) 

Playing Wunderland with mobile browser on Android: 

![wlclient-mobile](https://github.com/hkremss/wlclient/raw/master/docs/wl-mobile.png)

## Credits

Created by Raymond Xie, published under MIT license. 

Adapted, fixed and extended for Wunderland by Holger@Wunderland, Fuchur@Wunderland
