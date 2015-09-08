var mongojs = require('mongojs');
var db = mongojs('mydb', ['myTimeTable', 'myResults']);

var schedule = require('node-schedule');
var moment = require('moment');

var nodemailer = require('nodemailer');

var makeHTMLTable = function (items) {
    var res = "";i
    for(var i = 0; i < items.length; i++) {
        res += "<tr><td>" + items[i].activity + "</td><td>" + (items[i].duration/60) + "</td></tr>";
    }
    res = "<table><tr><td>Activity</td><td>Duration in min</td></tr>" + res + "</table>";
    return res;
}

var job = schedule.scheduleJob('0 0 * * 6', function(){
    console.log('Analysing the past week');
    var now = moment();
    var lastWeek = moment(now);
    var res = [];
    lastWeek.subtract(7, 'days');
    db.myTimeTable.find({secs: { $gt: lastWeek.unix(), $lt: now.unix()}}).sort({secs: 1}, function (err, docs) {
        docs.push({secs: now.unix()});
        for(var i = 0; i < docs.length-1; i++) {
            console.log(docs[i]);
            var found = false;
            for(var j = 0; j < res.length; j++) {
                if(res[j].activity == docs[i].activity) {
                    res[j].duration += docs[i+1].secs-docs[i].secs;
                    found = true;
                }
            }
            if(!found)
                res.push({activity: docs[i].activity, duration: docs[i+1].secs-docs[i].secs});
        }
        res.sort(function (a, b) {
            return a.duration - b.duration;
        });
        db.myResults.insert({from: lastWeek.format("DD MMMM YYYY"), to: now.format("DD MMMM YYYY"), detail: res});
        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'wassupbot@gmail.com',
                pass: 'abottoremindyou'
            }
        });

        var mailOptions = {
            from: '"Wass Up" <wassupbot@gmail.com>', // sender address
            to: 'aryaz.egh@gmail.com', // list of receivers
            subject: 'Your Weekly Activity', // Subject line
            text: 'Here is your activity for the past week', // plaintext body
            html: '', // html body
            attachments: []
        };
//        mailOptions.html = "<div>" + makeHTMLTable(res) + "</div>";
        var fileContent = '';
        fileContent += "[";
        for(var i = 0; i < res.length; i++) {
            if(i != 0)
                fileContent += ",";
            fileContent += "{ activity: " + res[i].activity + ", duration : " + Math.round(res[i].duration/60) + " min. Or " + Math.round(res[i].duration/3600) + " hr. }\n"
        }
        fileContent += "]";
        mailOptions.attachments.push({filename: lastWeek.format("DDMMMMYYYY")+"-"+now.format("DDMMMMYYYY")+".json", content: fileContent});
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
            }
        });
    });
});
