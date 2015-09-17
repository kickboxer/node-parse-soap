var express = require('express'),
    app = express(),
    mongoose = require('mongoose'),
    soap = require('soap'),
    _ = require('lodash'),
    url = 'http://www.nbrb.by/Services/ExRates.asmx?WSDL',
    date = new Date,
    args = { onDate: date.toISOString() };

app.set('port', (process.env.PORT || 6000));

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

mongoose.connect('mongodb://127.0.0.1:3001/meteor');
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {

    var ratesSchema = new mongoose.Schema({
        attributes: { type: Object },
        Cur_QuotName: String,
        Cur_Scale: Number,
        Cur_OfficialRate: Number,
        Cur_Code: Number,
        Cur_Abbreviation: String
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
                        Cur_QuotName: r.Cur_QuotName,
                        Cur_Scale: r.Cur_Scale,
                        Cur_OfficialRate: r.Cur_OfficialRate,
                        Cur_Code: r.Cur_Code,
                        Cur_Abbreviation: r.Cur_Abbreviation
                    });

                    rate.save(function(err, rate) {
                        if (err) return console.error(err);
                    });
                });
            }
        });
    });

});