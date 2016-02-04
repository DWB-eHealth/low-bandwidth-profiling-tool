function getMin(array) {
    return Math.min.apply(null, array);
}

function getMax(array) {
    return Math.max.apply(null, array);
}

function getAvg(array) {
    return array.reduce(function(sum, a, i, ar) {
        sum += a;
        return i == ar.length - 1 ? (ar.length == 0 ? 0 : sum / ar.length) : sum
    }, 0);
}

var config = {
    parallel: true,
    serial: true,
    files: [{
        size: '1',
        path: "/1KB.txt",
        runs: 25
    }, {
        size: '10',
        path: "/10KB.txt",
        runs: 10
    }, {
        size: '100',
        path: "/100KB.txt",
        runs: 2
    }]
};

function runTests() {
    config.files.forEach(function(file, index) {
        var timeTaken = [];
        for (var i = 0; i < file.runs; i++) {
            var startTime = +new Date;
            fetch(file.path + '?' + (+new Date)).then(function() {
                var row = document.getElementById(file.size);
                var requests = parseInt(row.getElementsByClassName('requests')[0].innerHTML);
                row.getElementsByClassName('requests')[0].innerHTML = ++requests;
                timeTaken.push(+new Date - startTime);
                console.log(timeTaken);
                row.getElementsByClassName('min')[0].innerHTML = getMin(timeTaken);
                row.getElementsByClassName('max')[0].innerHTML = getMax(timeTaken);
                row.getElementsByClassName('avg')[0].innerHTML = getAvg(timeTaken);
                row.getElementsByClassName('speed')[0].innerHTML = file.size * 8 / (getAvg(timeTaken) / 1000);
            });
        }
    });
}

function init() {
    config.files.forEach(function(file, index) {
        var row = document.createElement('tr');
        row.setAttribute('id', file.size);
        row.innerHTML = '<td>' + file.size + ' KB</td>' +
            '<td><progress id="" value="0" max="25" class="progressBar"></progress></td>' +
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
}

init();