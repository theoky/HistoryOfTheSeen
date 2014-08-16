// ==UserScript==
// @name History of the Seen
// @namespace https://github.com/theoky/HistoryOfTheSeen
// @description Script to implement a history of the seen approach for some news sites. Details at https://github.com/theoky/HistoryOfTheSeen
// @author          Theoky
// @version	        0.31
// @lastchanges     changed md5 lib
// @license         GNU GPL version 3
// @released        2014-02-20
// @updated         2014-08-14
// @homepageURL   	https://github.com/theoky/HistoryOfTheSeen
//
// @grant      GM_getValue
// @grant      GM_setValue
// @grant      GM_deleteValue
// @grant      GM_registerMenuCommand
// @grant      GM_listValues
//
// for testing (set greasemonkey.fileIsGreaseable) 
// @include file://*testhistory.html
//
// @include http*://*.derstandard.at/*
// @include http*://*.faz.net/*
// @include http*://*.golem.de/*
// @include http*://*.handelsblatt.com/*
// @include http*://*.heise.de/newsticker/*
// @include http*://*.kleinezeitung.at/*
// @include http*://*.nachrichten.at/*
// @include http*://*.oe24.at/*
// @include http*://*.orf.at/*
// @include http*://orf.at/*
// @include http*://*.reddit.com/*
// @include http*://*.spiegel.de/*
// @include http*://*.sueddeutsche.de/*
// @include http*://*.welt.de/*
// @include http*://*.wirtschaftsblatt.at/*
// @include http*://*.zeit.de/*
// @include http*://dastandard.at/*
// @include http*://derstandard.at/*
// @include http*://diepresse.com/*
// @include http*://diestandard.at/*
// @include http*://kurier.at/*
// @include http*://slashdot.org/*
// @include http*://taz.de/*

// @require https://greasyfork.org/scripts/130-portable-md5-function/code/Portable%20MD5%20Function.js?version=10066
// was require md5.js 
// was require http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/md5.js
// ==/UserScript==

// Copyright (C) 2014  T. Kopetzky - theoky
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// Tested with Firefox 31 and GreaseMonkey 2.1

//-------------------------------------------------
//Functions

//(function(){

var defaultSettings = {
			ageOfUrl: 7, 	// age in days after a url is deleted from the store
							// < 0 erases all dates (disables history)
			targetOpacity: 0.3,
			steps: 10,
			dimInterval: 30000
	}
	
	var dimMap = {};
	var countDownTimer = defaultSettings["steps"];
	var theHRefs = null;

	function resetAllUrls()
	{
		if (confirm('Are you sure you want to erase the complete seen history?')) {
			var keys = GM_listValues();
			for (var i=0, key=null; key=keys[i]; i++) {
				GM_deleteValue(key);
			}
			document.location.reload(true);
		}
	}

	function resetUrlsForCurrentSite()
	{
		if (confirm('Are you sure you want to erase the seen history for ' + 
				document.baseURI + '?')) {
			var keys = GM_listValues();
			for (var i=0, key=null; key=keys[i]; i++) {
				var dict = JSON.parse(GM_getValue(key, "{}"));
				if(dict) {
					if (dict["base"] == document.baseURI) {
						GM_deleteValue(key);
					}
				}
			}
			document.location.reload(true);
		}
	}

	function expireUrlsForCurrentSite()
	{
		var keys = GM_listValues();
		if (!keys) {
			return;
		}

		var cutOffDate = new Date();
		
		if (defaultSettings["ageOfUrl"] >= 0) {
			cutOffDate.setHours(0,0,0,0);
			cutOffDate.setDate((new Date()).getDate() - defaultSettings["ageOfUrl"]);
		}

		for (var i=0, key=null; key=keys[i]; i++) {
			var dict = JSON.parse(GM_getValue(key, "{}"));
			
			if(dict) {
				// console.log(dict["base"], cutOffDate.getTime(), dict["date"]);
				if ((dict["base"] == document.baseURI) &&
					 (cutOffDate.getTime() > dict["date"]))
				{
					GM_deleteValue(key);
				}
			}
			else {
				GM_log('Error! JSON.parse failed - dict is likely to be corrupted.');
			}
		}
	}

//	Main part

//	Menus
	GM_registerMenuCommand("Remove the seen history for this site.", resetUrlsForCurrentSite);
	GM_registerMenuCommand("Remove all seen history (for all sites)!", resetAllUrls);

	function run_script(){
		// Vars
		var allHrefs = document.getElementsByTagName("a");
		var theBase = document.baseURI;
		var elemMap = {};
		dimMap = {};

		// expire old data
		expireUrlsForCurrentSite();
		
		// Change the DOM

		// First loop: gather all new links and make already seen opaque.
		for(var i = 0; i < allHrefs.length; i++)
		{
			var hash = 'm' + hex_md5(allHrefs[i].href);
			// setValue needs letter in the beginning, thus use of 'm'

			var key = GM_getValue(hash);
			// console.log(allHrefs[i].href, hash.toString());

			if (typeof key != 'undefined') {
				// key found -> loaded this reference already 
				// change display
				allHrefs[i].style.opacity = defaultSettings["targetOpacity"];
			} else {
				// key not found, store it with current date
				elemMap[hash] = {"base":theBase, "date":(new Date()).getTime()};
				dimMap[hash] = allHrefs[i];
			}
		}

		// remember all new urls to hide the next time
		for (var e2 in elemMap) {
			GM_setValue(e2, JSON.stringify(elemMap[e2]));
		}
		
		theHRefs = allHrefs;
		to = setTimeout(dimLinks, defaultSettings["dimInterval"]);
	}

	function dimLinks() {
		interval = (1 - defaultSettings["targetOpacity"])/defaultSettings["steps"];
		countDownTimer = countDownTimer - 1;
		curOpacity = defaultSettings["targetOpacity"] + interval*countDownTimer;

		for(var i = 0; i < theHRefs.length; i++)
		{
			var hash = 'm' + hex_md5(theHRefs[i].href);
			if (hash in dimMap) {
				theHRefs[i].style.opacity = curOpacity;
			}
		}
		
		if (countDownTimer > 0) {
			to = setTimeout(dimLinks, defaultSettings["dimInterval"]);
		}
	}

	run_script();
//})();
