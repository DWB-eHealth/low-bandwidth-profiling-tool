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

    var runTests = function () {
        var printLog = function (logEntry) {
            var csvTextArea = document.getElementById('csvContent');
            csvTextArea.value += logEntry + '\n';
        };

        var printCsvHeader = function () {
            printLog('DateTime,FileSize,Status,Duration');
        };
        var generateJobs = function () {
            var jobList = [];
            config.files.forEach(function (file) {
                for (var i = 0; i < file.runs; i++) {
                    jobList.push(file);
                }
            });
            return jobList;
        };

        var recursivelyRunJob = function () {

            if (jobs.length == 0) return;

            var calculateResponseTime = function () {
                var endTime = new Date;
                var timeTaken = currentJob.callDurations;
                timeTaken.push(endTime - startTime);
                return endTime - startTime;
            };

            var updateUI = function () {
                var timeTaken = currentJob.callDurations,
                    row = document.getElementById(currentJob.size);

                var requests = parseInt(row.getElementsByClassName('requests')[0].innerHTML);
                row.getElementsByClassName('requests')[0].innerHTML = ++requests;
                row.getElementsByClassName('min')[0].innerHTML = getMin(timeTaken);
                row.getElementsByClassName('max')[0].innerHTML = getMax(timeTaken);
                row.getElementsByClassName('avg')[0].innerHTML = getAvg(timeTaken);
                row.getElementsByClassName('speed')[0].innerHTML = currentJob.size * 8 / (getAvg(timeTaken) / 1000);
            };

            var updateLogs = function (responseTime) {
                var dateTime = startTime.toISOString();
                printLog([dateTime, resourceURL, 'Status', responseTime].join(','));
            };

            var currentJob = jobs.shift(),
                startTime = new Date,
                resourceURL = currentJob.path + '?' + (+startTime);

            var waitForRequestToComplete = function (response) {
                return response.text();
            };

            fetch(resourceURL)
                .then(waitForRequestToComplete)
                .then(calculateResponseTime)
                .then(updateLogs)
                .then(updateUI)
                .then(recursivelyRunJob);
        };

        var jobs = generateJobs();
        printCsvHeader();
        recursivelyRunJob();
    };

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

    document
        .getElementById('run')
        .addEventListener('click', runTests);

    document
        .getElementById('csvContent')
        .addEventListener('click', function (event) {
            var csvTextArea = event.target;
            csvTextArea.focus();
            csvTextArea.select();
        });

})();