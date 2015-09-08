/**
The MIT License
Copyright (c) 2011 Arunoda Susiripala
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
var xmpp = require('../lib/simple-xmpp');
var argv = process.argv;
var alreadyRun = false;
var runID;
var mongojs = require('mongojs');
var db = mongojs('mydb', ['myTimeTable']);
var moment = require('moment');
var period = 0.5 //in hours

xmpp.on('online', function() {
    console.log('Yes, I\'m connected!');
});

xmpp.on('chat', function(from, message) {
    // xmpp.send(from, 'echo: ' + message);
    message = message.toLowerCase();
    if((message == '/run' || message == '/start') &&  !alreadyRun) {
        alreadyRun = true;
        xmpp.send(from, "App started");
        console.log("App started");
        runID = setInterval(function() {
            xmpp.send(from, "What are you doing?");
        }, period*60*60*1000);
   }
    else if(message == '/stop' && alreadyRun) {
        clearInterval(runID);
        alreadyRun = false;
        xmpp.send(from, "App stopped");
        console.log("App stopped");
    }
    else if(message.substring(0,5) == '/mute') {
        var args = message.substring(6);
        console.log("Muted for " + args);
        db.myTimeTable.save({time: moment().format(), secs: moment().unix(), activity: args});
        clearInterval(runID);
        runID = setInterval(function() {
            xmpp.send(from, "What are you doing?");
        }, period*60*60*1000);
    }
    else if(message == '/status') {
        xmpp.send(from, (alreadyRun?"Running":"Stopped"));
    }
    else {
        if(!alreadyRun) {
            alreadyRun = true;
            xmpp.send(from, "App started");
            console.log("App started");
            runID = setInterval(function() {
                xmpp.send(from, "What are you doing?");
            }, period*60*60*1000);
        }
        console.log("@ " + message);
        db.myTimeTable.save({time: moment().format(), secs: moment().unix(), activity: message});
    }
});

xmpp.on('error', function(err) {
    console.error(err);
});

xmpp.on('buddy', function(jid, state, statusText) {
    console.log("---------------%s is now '%s' (%s)", jid, state, statusText);
});

xmpp.connect({
    jid : argv[2],
    password : argv[3],
    host : 'talk.google.com',
    port : 5222
});
