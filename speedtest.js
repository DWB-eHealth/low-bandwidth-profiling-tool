function getMin(array) {
    return Math.min.apply(null, array);
}

function getMax(array) {
    return Math.max.apply(null, array);
}

function getAvg(array) {
    return array.reduce(function (sum, a, i, ar) {
        sum += a;
        return i == ar.length - 1 ? (ar.length == 0 ? 0 : sum / ar.length) : sum
    }, 0);
}

(function () {

    var config = {
        files: [{
            size: '1',
            path: "/1KB.txt",
            runs: 25,
            callDurations: []
        }, {
            size: '10',
            path: "/10KB.txt",
            runs: 10,
            callDurations: []
        }, {
            size: '100',
            path: "/100KB.txt",
            runs: 2,
            callDurations: []
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
    };

    var printCsvHeader = function () {
        printLog('DateTime,Href,Status,ContentLength,Duration');
    };

    var setupListeners = function () {
        document.getElementById('run').addEventListener('click', runTests);
        document.getElementById('csvContent').addEventListener('click', function (event) {
            var csvTextArea = event.target;
            csvTextArea.focus();
            csvTextArea.select();
        });
    };

    var generateJobs = function () {
        var jobs = [];
        config.files.forEach(function (file) {
            for (var i = 0; i < file.runs; i++) {
                jobs.push({
                    file: file
                });
            }
        });
        return jobs;
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
        console.log(job);
        var row = document.getElementById(job.file.size);
        row.getElementsByClassName('requests')[0].innerHTML = job.file.callDurations.length;
        row.getElementsByClassName('min')[0].innerHTML = getMin(job.file.callDurations);
        row.getElementsByClassName('max')[0].innerHTML = getMax(job.file.callDurations);
        row.getElementsByClassName('avg')[0].innerHTML = getAvg(job.file.callDurations);
        row.getElementsByClassName('speed')[0].innerHTML = job.file.size * 8 / (getAvg(job.file.callDurations) / 1000);
    };

    var runTests = function () {
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
        recursivelyRunJob();
    };

    initializeSummaryTable();
    printCsvHeader();
    setupListeners();
})();