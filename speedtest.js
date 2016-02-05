(function () {
    var ONE_SECOND = 1000;

    var config = {
        schedule: {
            numberOfTests: 8,
            intervalInSeconds: 60 * 60
        },
        files: [{
            size: '1',
            filename: '1KB.txt',
            numberOfRequests: 25
        }, {
            size: '10',
            filename: '10KB.txt',
            numberOfRequests: 10
        }, {
            size: '100',
            filename: '100KB.txt',
            numberOfRequests: 2
        }]
    };

    var saveResultsToLocalStorage = function () {
        var payload = {},
            csvTextArea = document.getElementById('csvContent');

        config.files.forEach(function (file) {
            payload[file.filename] = file.callDurations;
        });

        window.localStorage.setItem('callDurations', JSON.stringify(payload));
        window.localStorage.setItem('logs', csvTextArea.value);
    };

    var loadResultsFromLocalStorage = function () {
        var savedCallDurations = JSON.parse(window.localStorage.getItem('callDurations')) || {},
            logs = window.localStorage.getItem('logs'),
            csvTextArea = document.getElementById('csvContent');

        csvTextArea.value = logs;
        config.files.forEach(function (file) {
            file.callDurations = savedCallDurations[file.filename] || [];
            updateSummaryTable({'file': file});
        });
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

    var updateTimeToNextTest = function(timeToNextTest) {
        var timeToNextTestDom = document.getElementById('timeToNextTest');
        var minutes = parseInt(timeToNextTest / 60);
        var seconds = timeToNextTest % 60;
        timeToNextTestDom.innerHTML = minutes + ':' + (seconds < 10 ? '0': '') + seconds;
    };

    var startCountdownToNextTest = function() {
        var timeToNextTest = config.schedule.intervalInSeconds;
        var interval = setInterval(function () {
            timeToNextTest--;
            if (timeToNextTest <= 0) {
                clearInterval(interval);
                //Remove countdown message
            } else {
                updateTimeToNextTest(timeToNextTest);
            }
        }, ONE_SECOND);

        updateTimeToNextTest(timeToNextTest);
    };

    var updateStatus = function(inProgress) {
        var progressDom = document.getElementById('progressOfTests');
        var testsCompleteDom = document.getElementById('testsComplete');
        var runButton = document.getElementById('run');
        if(inProgress) {
            runButton.disabled = true;
            progressDom.style.display = 'inline';
            testsCompleteDom.style.display = 'none';
        } else {
            runButton.disabled = false;
            progressDom.style.display = 'none';
            testsCompleteDom.style.display = 'inline';
        }
    };

    var printLog = function (logEntry) {
        var csvTextArea = document.getElementById('csvContent');
        csvTextArea.value += logEntry + '\n';
        csvTextArea.scrollTop = csvTextArea.scrollHeight
    };

    var printCsvHeader = function () {
        var csvTextArea = document.getElementById('csvContent');
        if(csvTextArea.value.length == 0) {
            printLog('DateTime,Href,Status,ContentLength,Duration');
        }
    };

    var formatDecimals = function(number, decimalPlaces) {
        if(decimalPlaces === undefined) {
            if (number >= 1000) {
                decimalPlaces = 0;
            } else if (number >= 10) {
                decimalPlaces = 1;
            } else {
                decimalPlaces = 2;
            }
        }
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
            speed: file.size * 8 / (averageTime / ONE_SECOND)

        };
    };

    var requestFile = function (job) {
        job.startTime = new Date;
        return fetch(window.location + job.file.filename + '?' + (+job.startTime)).then(function (response) {
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
        saveResultsToLocalStorage();
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
        saveResultsToLocalStorage();
        return job;
    };

    var updateSummaryTable = function (job) {
        var row = document.getElementById(job.file.size),
            stats = calculateStatistics(job.file);
        row.getElementsByClassName('requests')[0].innerHTML = stats.requests;
        row.getElementsByClassName('min')[0].innerHTML = formatDecimals(stats.min);
        row.getElementsByClassName('max')[0].innerHTML = formatDecimals(stats.max);
        row.getElementsByClassName('avg')[0].innerHTML = formatDecimals(stats.avg);
        row.getElementsByClassName('speed')[0].innerHTML = formatDecimals(stats.speed);
    };

    var runTest = function () {
        var recursivelyRunJob = function () {
            if (jobList.length == 0) return;

            return requestFile(jobList.shift())
                .then(waitForRequestToComplete)
                .then(getPerformanceTiming)
                .then(updateLogs)
                .then(updateSummaryTable)
                .then(recursivelyRunJob);
        };

        var jobList = generateJobs();

        // flush resource timings because of buffer limit of 150 imposed by browser
        window.performance.clearResourceTimings();

        return recursivelyRunJob();
    };

    var scheduleTests = function () {
        var numberOfTests = 0;
        var interval = setInterval(function () {
            numberOfTests++;
            if (numberOfTests >= config.schedule.numberOfTests) {
                clearInterval(interval);
                runTest().then(function() {
                    updateStatus(false);
                });
            } else {
                runTest();
                startCountdownToNextTest();
            }
        }, config.schedule.intervalInSeconds * ONE_SECOND);
        printCsvHeader();
        runTest();
        numberOfTests++;
        startCountdownToNextTest();
        updateStatus(true);
    };

    initializeSummaryTable();
    setupListeners();
    loadResultsFromLocalStorage();
})();