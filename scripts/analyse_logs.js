#!/usr/bin/env node

var fs = require('fs-promise'),
    csv = require('fast-csv');

var args = process.argv.slice(2),
    filename = args[0],
    fileSizeAndCallDurations = {};

if (!filename || args.length < 1) {
    console.log('Usage: npm run analyse-logs filename');
    process.exit(1);
}

var processData = function(data) {
    var fileSize = data['ContentLength'],
        duration = parseFloat(data['Duration']);

    fileSizeAndCallDurations[fileSize] = fileSizeAndCallDurations[fileSize] || [];
    fileSizeAndCallDurations[fileSize].push(duration);
};

var calculateStats = function() {
    var cleanseAndFormat = function(value) {
        return value == Infinity ? 0: Number(value).toFixed(3);
    };

    var average = function (array) {
        return array.reduce(function (a, b) {
                return a + b;
            }, 0) / array.length;
    };

    for(var fileSize in fileSizeAndCallDurations) {
        var callDurations = fileSizeAndCallDurations[fileSize],
            sizeInKilobytes = parseInt(fileSize) / 1024,
            averageTime = average(callDurations);

        var stats = {
            fileSize: sizeInKilobytes,
            requests: callDurations.length,
            min: cleanseAndFormat(Math.min.apply(null, callDurations)),
            max: cleanseAndFormat(Math.max.apply(null, callDurations)),
            avg: cleanseAndFormat(averageTime),
            speed: cleanseAndFormat(sizeInKilobytes * 8 / (averageTime / 1000))
        };
        console.log(JSON.stringify(stats, null, 2));
    }
};

fs.createReadStream(filename)
    .pipe(csv({headers: true}))
    .on("data", function(data){
        processData(data);
    })
    .on("end", function(){
        calculateStats();
    });
