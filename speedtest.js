(function () {

    var config = {
        schedule: {
            numberOfTests: 8,
            intervalInSeconds: 60 * 60
        },
        files: [{
            size: '1',
            path: "/1KB.txt",
            numberOfRequests: 25
        }, {
            size: '10',
            path: "/10KB.txt",
            numberOfRequests: 10
        }, {
            size: '100',
            path: "/100KB.txt",
            numberOfRequests: 2
        }]
    };

    var initializeSummaryTable = function () {
        config.files.forEach(function (file) {
            var row = document.createElement('tr');
            row.setAttribute('id', file.size);
            row.innerHTML = '<td>' + file.size + ' KB</td>' +
                '<td class="requests">0</td>' +
                '<td class="min">0</td>' +
                '<td class="max">0</td>' +
                '<td class="avg">0</td>' +
                '<td class="speed">0</td>';
            document.getElementById('results').appendChild(row);
        });
    };

    var printLog = function (logEntry) {
        var csvTextArea = document.getElementById('csvContent');
        csvTextArea.value += logEntry + '\n';
        csvTextArea.scrollTop = csvTextArea.scrollHeight
    };

    var printCsvHeader = function () {
        printLog('DateTime,Href,Status,ContentLength,Duration');
    };

    var formatDecimals = function(number, decimalPlaces) {
        if(decimalPlaces === undefined) decimalPlaces = 2;
        return Number(number).toFixed(decimalPlaces);
    };

    var setupListeners = function () {
        document.getElementById('run').addEventListener('click', scheduleTests);
        document.getElementById('csvContent').addEventListener('click', function (event) {
            var csvTextArea = event.target;
            csvTextArea.focus();
            csvTextArea.select();
        });
    };

    var generateJobs = function () {
        var jobs = [];
        config.files.forEach(function (file) {
            file.callDurations || (file.callDurations = []);
            for (var i = 0; i < file.numberOfRequests; i++) {
                jobs.push({
                    file: file
                });
            }
        });
        return jobs;
    };

    var calculateStatistics = function (file) {
        var average = function (array) {
            return array.reduce(function (a, b) {
                    return a + b;
                }, 0) / array.length;
        };
        var averageTime = average(file.callDurations);

        return {
            requests: file.callDurations.length,
            min: Math.min.apply(null, file.callDurations),
            max: Math.max.apply(null, file.callDurations),
            avg: averageTime,
            speed: file.size * 8 / (averageTime / 1000)

        };
    };

    var requestFile = function (job) {
        job.startTime = new Date;
        return fetch(job.file.path + '?' + (+job.startTime)).then(function (response) {
            job.response = response;
            return job;
        });
    };

    var waitForRequestToComplete = function (job) {
        return job.response.text().then(function () {
            return job;
        });
    };

    var getPerformanceTiming = function (job) {
        job.timing = window.performance.getEntriesByName(job.response.url)[0];
        job.file.callDurations.push(job.timing.duration);
        return job;
    };

    var updateLogs = function (job) {
        printLog([
            job.startTime.toISOString(),
            job.response.url,
            job.response.status,
            job.response.headers.get('Content-length'),
            job.timing.duration
        ].join(','));
        return job;
    };

    var updateSummaryTable = function (job) {
        var row = document.getElementById(job.file.size),
            stats = calculateStatistics(job.file);
        row.getElementsByClassName('requests')[0].innerHTML = stats.requests;
        row.getElementsByClassName('min')[0].innerHTML = formatDecimals(stats.min);
        row.getElementsByClassName('max')[0].innerHTML = formatDecimals(stats.max);
        row.getElementsByClassName('avg')[0].innerHTML = formatDecimals(stats.avg);
        row.getElementsByClassName('speed')[0].innerHTML = formatDecimals(stats.speed, 0);
    };

    var runTest = function () {
        var recursivelyRunJob = function () {
            if (jobList.length == 0) return;

            requestFile(jobList.shift())
                .then(waitForRequestToComplete)
                .then(getPerformanceTiming)
                .then(updateLogs)
                .then(updateSummaryTable)
                .then(recursivelyRunJob);
        };

        var jobList = generateJobs();

        // flush resource timings because of buffer limit of 150 imposed by browser
        window.performance.clearResourceTimings();

        recursivelyRunJob();
    };

    var scheduleTests = function () {
        var numberOfTests = 0;
        var interval = setInterval(function () {
            runTest();
            numberOfTests++;
            if (numberOfTests >= config.schedule.numberOfTests) {
                clearInterval(interval);
            }
        }, config.schedule.intervalInSeconds * 1000);
        runTest();
        numberOfTests++;
    };

    initializeSummaryTable();
    printCsvHeader();
    setupListeners();
})();