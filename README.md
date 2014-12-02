HistoryOfTheSeen
================

You know and use the history feature of your browser. This feature remembers the links you clicked. As a result you see them rendered differently from unvisited links (if not someone changes that).

But not only the decision to follow a link is rememberable but also the decision which links not to follow. 

Let's take a newspaper for an analogy. When you read a newspaper you skim over the pages, just scanning the headlines. Those which seem interesting probably lead you to read the article as well. So after you scanned the paper, you read a lot of headlines and some articles. And, more important, you know that you are finished with that specific issue of the newspaper.

Now let us take a look at a new "newspaper", e.g. reddit.

You can scan the frontpage and open some links (ok, who am I kidding ;) - but let us go on for the moment with some links) in new tabs. Those links on the frontpage change their color; you have visited them (at least the browser thinks so). So far the analogy with the newspaper holds.

So some time later you load the frontpage of reddit again. Here it is that the analogy breaks: Really new links which you have never seen before mix with visited links (colored) and old links you have decided not to follow.

Now of course you could just read every single link but that is not what I've in mind.

Deciding again which link to follow is cumbersome. That is where this Greasemonkey script helps a little bit.

# What the script does
If you load a page it remembers every link in the database of Greasemonkey. The next time you load the same page, all links which are already in the database are assumed to be seen by you already and are made transparent. Really new links shine out and can be easily identified.

The screenshots give a good impression how the script works:

##An unvisited reddit front page (as if that happens ;)
![Reddit unvisited](doc/assets/reddit1.png "Reddit unvisited")

##The reddit front page after some visiting.
![Reddit visited](doc/assets/reddit2.png "Reddit visited")

##After visiting the front page and revisiting it
![Reddit seen](doc/assets/reddit3.png "Reddit seen")

##After visiting the front page with new links
![Reddit seen with new link](doc/assets/reddit4.png "Reddit seen with new link")
Two links have already been seen but not been deemed clickworthy.

# What the script does, technically
It just goes through the a href elements, computes a hash and stores the hash. If it encounters a hash that already has been stored during loading, this link will be painted more transparently.

In addition, for some configurable sites it looks up the node hierarchy for special nodes. If such a node is found that node with its subnodes is made more transparent and thus a bigger area is affected.

# Features
* settings (in a way)
* hiding a specific context of a link (for some sites)
* hiding links only after some time
* remembering links only for a configurable time
* "Threading" when doing some long running database operations

# Shortcomings

Still a lot. ;) This is an early version of this script. There are a lot of things which might be improved, and you're welcome to send improvements as ideas (or patches ;) ). 

# License
* The source is licensed under GPL v3 or later.
* The md5 source is taken from <https://greasyfork.org/scripts/130-portable-md5-function>
(or <http://pajhome.org.uk/crypt/md5/md5.html>) and is licensed under the BSD License.

# Remarks
Tested with Firefox 34 and GreaseMonkey 2.3
