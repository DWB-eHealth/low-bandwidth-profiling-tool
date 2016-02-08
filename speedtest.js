(function () {
    var ONE_SECOND = 1000,
        numberOfCompletedBatches,
        $csvLogs,
        $timeToNextBatch,
        $numberOfBatches,
        $completedBatches,
        $progressSummary,
        $summaryTable,
        $testSuiteCompleteMessage,
        $nextBatchMessage,
        $runTestSuite,
        $clearResults;

    var config = {
        schedule: {
            numberOfTests: 12,
            intervalInSeconds: 60 * 60
        },
        files: [{
            size: '1',
            filename: '1KB.txt',
            numberOfRequests: 25
        }, {
            size: '10',
            filename: '10KB.txt',
            numberOfRequests: 5
        }, {
            size: '100',
            filename: '100KB.txt',
            numberOfRequests: 2
        }]
    };

    var saveResultsToLocalStorage = function () {
        var payload = {};

        config.files.forEach(function (file) {
            payload[file.filename] = file.callDurations;
        });

        window.localStorage.setItem('callDurations', JSON.stringify(payload));
        window.localStorage.setItem('logs', $csvLogs.value);
    };

    var loadResultsFromLocalStorage = function () {
        var storedResults = JSON.parse(window.localStorage.getItem('callDurations')) || {};

        $csvLogs.value = window.localStorage.getItem('logs');
        config.files.forEach(function (file) {
            file.callDurations = storedResults[file.filename] || [];
            updateSummaryTable({'file': file});
        });
    };

    var clearResults = function () {
        config.files.forEach(function (file) {
            file.callDurations = [];
        });
        $csvLogs.value = '';
        saveResultsToLocalStorage();
        loadResultsFromLocalStorage();
    };

    var initializeSummaryTable = function () {
        var createTableCell = function(className, contents) {
            var cell = document.createElement('td');
            cell.className = className;
            cell.innerHTML = contents;
            return cell;
        };

        config.files.forEach(function (file) {
            file.summaryTableRow = {
                requests: createTableCell('requests', 0),
                min: createTableCell('min', 0),
                max: createTableCell('max', 0),
                avg: createTableCell('avg', 0),
                speed: createTableCell('speed', 0)
            };

            var row = document.createElement('tr');
            row.appendChild(createTableCell('fileSize', file.size + ' KB'));
            row.appendChild(file.summaryTableRow.requests);
            row.appendChild(file.summaryTableRow.min);
            row.appendChild(file.summaryTableRow.max);
            row.appendChild(file.summaryTableRow.avg);
            row.appendChild(file.summaryTableRow.speed);
            $summaryTable.appendChild(row);
        });
    };

    var updateTimeToNextTest = function(timeToNextTest) {
        var minutes = parseInt(timeToNextTest / 60);
        var seconds = timeToNextTest % 60;
        $timeToNextBatch.innerHTML = minutes + ':' + (seconds < 10 ? '0': '') + seconds;
    };

    var startCountdownToNextTest = function() {
        var timeToNextTest = config.schedule.intervalInSeconds;
        var interval = setInterval(function () {
            timeToNextTest--;
            if (timeToNextTest <= 0) {
                clearInterval(interval);
            } else {
                updateTimeToNextTest(timeToNextTest);
            }
        }, ONE_SECOND);

        updateTimeToNextTest(timeToNextTest);
    };

    var updateBatchProgress = function() {
        $numberOfBatches.innerHTML = config.schedule.numberOfTests;
        $completedBatches.innerHTML = numberOfCompletedBatches;
    };

    var updateStatus = function(state) {
        if(state == 'testsStarted') {
            $runTestSuite.disabled = true;
            $clearResults.disabled = true;
            $progressSummary.style.display = 'inline';
            $testSuiteCompleteMessage.style.display = 'none';
            $nextBatchMessage.style.display = 'inline';
        } else if (state == 'finalTestStarted') {
            $nextBatchMessage.style.display = 'none';
        } else if (state == 'testSuiteCompleted') {
            $runTestSuite.disabled = false;
            $clearResults.disabled = false;
            $progressSummary.style.display = 'none';
            $testSuiteCompleteMessage.style.display = 'inline';
        }
    };

    var printLog = function (logEntry) {
        $csvLogs.value += logEntry + '\n';
        $csvLogs.scrollTop = $csvLogs.scrollHeight
    };

    var printCsvHeader = function () {
        if($csvLogs.value.length == 0) {
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
        $runTestSuite.addEventListener('click', scheduleTests);
        $clearResults.addEventListener('click', clearResults);
        $csvLogs.addEventListener('click', function () {
            $csvLogs.focus();
            $csvLogs.select();
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
        var handleDivisionByZero = function(value) {
            return file.callDurations.length == 0 ? 0 : value;
        };
        var average = function (array) {
            return array.reduce(function (a, b) {
                    return a + b;
                }, 0) / array.length;
        };
        var averageTime = average(file.callDurations);

        return {
            requests: file.callDurations.length,
            min: handleDivisionByZero(Math.min.apply(null, file.callDurations)),
            max: handleDivisionByZero(Math.max.apply(null, file.callDurations)),
            avg: handleDivisionByZero(averageTime),
            speed: handleDivisionByZero(file.size * 8 / (averageTime / ONE_SECOND))
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
        var stats = calculateStatistics(job.file);
        job.file.summaryTableRow.requests.innerHTML = stats.requests;
        job.file.summaryTableRow.min.innerHTML = formatDecimals(stats.min);
        job.file.summaryTableRow.max.innerHTML = formatDecimals(stats.max);
        job.file.summaryTableRow.avg.innerHTML = formatDecimals(stats.avg);
        job.file.summaryTableRow.speed.innerHTML = formatDecimals(stats.speed);
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
        var interval = setInterval(function () {
            numberOfCompletedBatches++;
            if (numberOfCompletedBatches >= config.schedule.numberOfTests) {
                clearInterval(interval);
                updateStatus('finalTestStarted');
                runTest().then(function() {
                    updateBatchProgress();
                    updateStatus('testSuiteCompleted');
                });
            } else {
                runTest().then(updateBatchProgress);
                startCountdownToNextTest();
            }
        }, config.schedule.intervalInSeconds * ONE_SECOND);

        numberOfCompletedBatches = 0;
        printCsvHeader();
        updateBatchProgress();
        runTest().then(updateBatchProgress);
        numberOfCompletedBatches++;
        startCountdownToNextTest();
        updateStatus('testsStarted');
    };

    $timeToNextBatch = document.getElementById('timeToNextBatch');
    $nextBatchMessage = document.getElementById('nextBatch');
    $numberOfBatches = document.getElementById('numberOfBatches');
    $completedBatches = document.getElementById('completedBatches');
    $progressSummary = document.getElementById('progressOfTestSuite');
    $testSuiteCompleteMessage = document.getElementById('testSuiteComplete');
    $summaryTable = document.getElementById('summaryTable');
    $csvLogs = document.getElementById('csvContent');
    $runTestSuite = document.getElementById('runTestSuite');
    $clearResults = document.getElementById('clearResults');

    initializeSummaryTable();
    setupListeners();
    loadResultsFromLocalStorage();
})();