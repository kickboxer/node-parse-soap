var express = require('express'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    app = express(),
    soap = require('soap'),
    _ = require('lodash'),
    cors = require('cors'),
    bodyParser = require('body-parser'),
    config = require('./settings'),
    async = require('async'),
    cron = require('cron').CronJob,
    url = 'http://www.nbrb.by/Services/ExRates.asmx?WSDL',
    date = new Date,
    args = { onDate: date.toISOString() };


app.use(cors());
app.use(bodyParser.json());

var ratesSchema = new mongoose.Schema({
    attributes: {
        type: Object
    },
    name: String,
    scale: Number,
    rate: Number,
    code: Number,
    abbreviation: String,
    updated: {
        type: Date,
        default: Date.now
    }
});

app.post('/', function(req, res){
    mongoose.connect(config.mongoUrl);
    var db = mongoose.connection;
    db.on('error', console.error);
    db.once('open', function() {

        var ExRates = mongoose.model('ExRates', ratesSchema);

        ExRates.find({'updated' : new Date(req.body.date).toISOString()}, function (err, rates) {
            delete mongoose.models['ExRates'];
            delete mongoose.modelSchemas['ExRates'];
            mongoose.connection.close();
            res.send(rates);
        });

    });
});

new cron('0 0 0 * * *', function() {
    mongoose.connect(config.mongoUrl);
    var db = mongoose.connection;
    db.on('error', console.error);
    db.once('open', function() {

        var ExRates = mongoose.model('ExRates', ratesSchema);

        soap.createClient(url, function(err, client) {
            client.ExRatesDaily(args, function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    var rates = result.ExRatesDailyResult.diffgram.NewDataSet.DailyExRatesOnDate;
                    var date = moment().format('YYYY-MM-DD');
                    async.forEachOf(rates, function (r, key, callback) {
                        var rate = new ExRates({
                            attributes: [Object],
                            name: r.Cur_QuotName,
                            scale: r.Cur_Scale,
                            rate: r.Cur_OfficialRate,
                            code: r.Cur_Code,
                            abbreviation: r.Cur_Abbreviation,
                            updated: date
                        });

                        rate.save(function(err, rate) {
                            if (err) return console.error(err);
                        });
                    }, function (err) {
                        if (err) console.error(err.message);
                    });
                    delete mongoose.models['ExRates'];
                    delete mongoose.modelSchemas['ExRates'];
                    mongoose.connection.close();
                }
            });
        });

    });
}, null, true, 'America/Los_Angeles');

app.listen(8888);