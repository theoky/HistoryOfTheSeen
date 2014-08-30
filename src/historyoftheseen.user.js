// ==UserScript==
// @name History of the Seen
// @namespace https://github.com/theoky/HistoryOfTheSeen
// @description Script to implement a history of the seen approach for some news sites. Details at https://github.com/theoky/HistoryOfTheSeen
// @author          Theoky
// @version	        0.40
// @lastchanges     semicolons, upTriggers, clean DB only daily
// @license         GNU GPL version 3
// @released        2014-02-20
// @updated         2014-08-31
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
// @include http*://notalwaysright.com/

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
			ageOfUrl: 5, 	// age in days after a url is deleted from the store
							// < 0 erases all dates (disables history)
			targetOpacity: 0.3,
			targetOpacity4Dim: 0.65,
			steps: 10,
			dimInterval: 30000,
			expireAllDomains: true,		// On fast machines this can be true and expires
							// all domains in the database with each call. If false,
							// only the urls of the current domain are expired which 
							// is slightly faster.
			cleanOnlyDaily: true
		}

	var perUrlSettings = [
		{
			url : '.*\.?derstandard\.at',
			// TODO: der, die, das standard
			upTrigger: "../a",
			parentHints : [
					"ancestor::div[contains(concat(' ', @class, ' '), ' text ')]",
					"ancestor::ul[@class='stories']" ]
		},

		{
			url : 'notalwaysright\.com',
			upTrigger: "../a[@rel='bookmark']",
			parentHints : [ "ancestor::div[contains(concat(' ', @class, ' '), ' post ')]" ]
		},

		{
			url : '.*\.?golem.de',
			upTrigger: "../a",
			parentHints : [ "ancestor::li",
					"ancestor::section[@id='index-promo']",
					"ancestor::section[contains(concat(' ', @class, ' '), ' promo ')]" ]
		},

		{
			url : '.*\.?reddit.com',
			// class="title may-blank  srTagged imgScanned"
			upTrigger: "../a[contains(@class, 'title') and contains(@class, 'may-blank')]",
			parentHints : [ "ancestor::div[contains(concat(' ', @class, ' '), ' thing ')]" ]
		}
	]
	
	var dimMap = {};
	var countDownTimer = defaultSettings.steps;
	var theHRefs = null;
	var curSettings = null;
	var keyLastExpireOp = "lastExpire";

	function resetAllUrls() {
		if (confirm('Are you sure you want to erase the complete seen history?')) {
			var keys = GM_listValues();
			for (var i=0, key=null; key=keys[i]; i++) {
				GM_deleteValue(key);
			}
			document.location.reload(true);
		}
	}

	function resetUrlsForCurrentHelper(dKey, domainOrUri) {
		if (confirm('Are you sure you want to erase the seen history for ' + 
				domainOrUri + '?')) {
			var keys = GM_listValues();
			for (var i=0, key=null; key=keys[i]; i++) {
				var dict = JSON.parse(GM_getValue(key, "{}"));
				if(dict) {
					if (dict[dKey] == domainOrUri) {
						GM_deleteValue(key);
					}
				}
			}
			document.location.reload(true);
		}
	}
	
	function resetUrlsForCurrentDomain() {
		resetUrlsForCurrentHelper("domain", document.domain)
	}
	
	function resetUrlsForCurrentSite() {
		resetUrlsForCurrentHelper("base", document.baseURI)
	}

	function expireUrls()	{
		if (defaultSettings.cleanOnlyDaily) {
			lastExpireDate = new Date(GM_getValue(keyLastExpireOp, nDaysOlderFromNow(2)));
			diff = Math.abs((new Date()) - lastExpireDate);
			if (diff / 1000 / 3600 / 24 < 1) {
				// less than one day -> no DB cleaning
				return;
			}
		}

		var keys = GM_listValues();
		if (!keys) {
			return;
		}

		var cutOffDate = nDaysOlderFromNow(defaultSettings.ageOfUrl);

		for (var i=0, key=null; key=keys[i]; i++) {
			if (key == keyLastExpireOp){
				continue;
			}
				
			var dict = JSON.parse(GM_getValue(key, "{}"));
			
			if(dict) {
				try {
					// console.log(dict["domain"], cutOffDate.getTime(), dict["date"]);
					if (cutOffDate.getTime() > dict["date"]) {
						if (defaultSettings.expireAllDomains ||
							(dict["domain"] == document.domain))
						{
							GM_deleteValue(key);
						}
					}
				} catch (e) {
					console.log(e);
				}
			}
			else {
				console.log('Error! JSON.parse failed - dict is likely to be corrupted.');
			}
		}
		GM_setValue(keyLastExpireOp, new Date());
	}

	function nDaysOlderFromNow(age, aDate, zeroHour) {
		aDate = typeof aDate !== 'undefined' ? aDate : new Date();
		zeroHour = typeof zeroHour !== 'undefined' ? zeroHour : true;
		
		var dateStore = new Date(aDate.getTime());
		var workDate = aDate;
		if (age >= 0) {
			workDate.setDate(dateStore.getDate() - age);
			if (zeroHour) {
				workDate.setHours(0,0,0,0);
			}
		}
		return workDate;
	}

	/*
	 * Find the settings for a given URL
	 */
	function findPerUrlSettings(theSettings, aDomain) {
		for (var i=0; i < theSettings.length; ++i) {
			var myRegExp = new RegExp(theSettings[i].url, 'i');
			if (aDomain.match(myRegExp)) {
				return theSettings[i];
			}
		}
	}

	/*
	 * Find the parent element as specified in the settings.
	 */
	function locateParentElem(curSettings, aDomain, aRoot) {
		if (!curSettings) {
			return null;
		}
		// console.log("locateParentElem 1", curSettings.url);
		var res = null;
		for (xpath = 0; xpath < curSettings.parentHints.length; ++xpath) {
			// console.log("locateParentElem 2", curSettings.parentHints[xpath], aRoot);
			res = document.evaluate(curSettings.parentHints[xpath], aRoot, null, 9, null).singleNodeValue;
			if (res) {
				// console.log("locateParentElem found something");
				return res;
			}
		}
		return res;
	}
	
	/*
	 * Check if the current node qualifies for looking up the hierarchy. 
	 */
	function goUp(curSettings, aRoot) {
		if (!curSettings) {
			return null;
		}

		res = null;
		if (curSettings.upTrigger != "") {
			res = document.evaluate(curSettings.upTrigger, aRoot, null, 9, null).singleNodeValue;
		}
		return res != null
	}
	
	
	function dimLinks() {
		interval = (1 - defaultSettings.targetOpacity4Dim)/defaultSettings.steps;
		countDownTimer = countDownTimer - 1;
		curOpacity = defaultSettings.targetOpacity4Dim + interval*countDownTimer;

		for(var i = 0; i < theHRefs.length; i++)
		{
			var hash = 'm' + hex_md5(theHRefs[i].href);
			if (hash in dimMap) {
				theHRefs[i].style.opacity = curOpacity;
			}
		}
		
		if (countDownTimer > 0) {
			to = setTimeout(dimLinks, defaultSettings.dimInterval);
		}
	}

//	Main part

//	Menus
	GM_registerMenuCommand("Remove the seen history for this site.", resetUrlsForCurrentSite);
	GM_registerMenuCommand("Remove the seen history for this domain.", resetUrlsForCurrentDomain);
	GM_registerMenuCommand("Remove all seen history (for all sites)!", resetAllUrls);

	function run_script() {
		// Vars
		var allHrefs = document.getElementsByTagName("a");
		var theBase = document.baseURI;
		var theDomain = document.domain;
		var elemMap = {};
		
		dimMap = {};

		curSettings = findPerUrlSettings(perUrlSettings, theDomain);
		// console.log(curSettings);

		// expire old data
		expireUrls();

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
				
				done = false;
				if(goUp(curSettings, allHrefs[i])) {
					pe = locateParentElem(curSettings, theDomain, allHrefs[i])
					// console.log("locate parent done", pe);
					if (pe) {
						pe.style.opacity = defaultSettings.targetOpacity;
						done = true;
					}
				}
				if (!done) {
					// change display
					allHrefs[i].style.opacity = defaultSettings.targetOpacity;
				}
				
			} else {
				// key not found, store it with current date
				elemMap[hash] = {"domain":theDomain, "date":(new Date()).getTime(), "base":theBase};
				dimMap[hash] = allHrefs[i];
			}
		}

		// remember all new urls to hide the next time
		for (var e2 in elemMap) {
			GM_setValue(e2, JSON.stringify(elemMap[e2]));
		}
		
		theHRefs = allHrefs;
		to = setTimeout(dimLinks, defaultSettings.dimInterval);
	}

	run_script();
//})();
