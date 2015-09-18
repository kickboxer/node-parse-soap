var mongoose = require('mongoose'),
    soap = require('soap'),
    _ = require('lodash'),
    config = require('./settings'),
    url = 'http://www.nbrb.by/Services/ExRates.asmx?WSDL',
    date = new Date,
    args = { onDate: date.toISOString() };

var http = require("http");

var server = http.createServer();
server.listen(8888);

mongoose.connect(config.mongoUrl);
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {

    var ratesSchema = new mongoose.Schema({
        attributes: { type: Object },
        name: String,
        scale: Number,
        rate: Number,
        code: Number,
        abbreviation: String
    });
    mongoose.connection.db.dropCollection('exrates', function(err, result) {
        console.log(result);
    });
    var ExRates = mongoose.model('ExRates', ratesSchema);

    soap.createClient(url, function(err, client) {
        client.ExRatesDaily(args, function(err, result) {
            if (err) {
                console.log(err);
            } else {
                var rates = result.ExRatesDailyResult.diffgram.NewDataSet.DailyExRatesOnDate;
                _.forEach(rates, function(r) {
                    var rate = new ExRates({
                        attributes: [Object],
                        name: r.Cur_QuotName,
                        scale: r.Cur_Scale,
                        rate: r.Cur_OfficialRate,
                        code: r.Cur_Code,
                        abbreviation: r.Cur_Abbreviation
                    });

                    rate.save(function(err, rate) {
                        if (err) return console.error(err);
                    });
                });
            }
        });
    });

});