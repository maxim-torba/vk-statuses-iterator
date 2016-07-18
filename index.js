const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const retry = require('retry');

var pageNumber;

fs.readFile('data.json', 'utf-8', (err, data) => {
    if (err) throw err;
    pageNumber = +JSON.parse(data).lastPageNumber;
    setInterval(makeRequest, 100);
});

function makeRequest(href) {
    //console.log(address);
    let operation = retry.operation();
    operation.attempt(function () {
            let address = href || 'http://vk.com/id' + pageNumber++ /*'134915621'*/;
            request({uri: address, method: 'GET', encoding: 'utf8'},
                function (err, res) {
                    if (operation.retry(err)) {
                        console.log(err.message);
                        return;
                    }

                    findOnPage(res.body, address);
                })
        }
    );
}

function findOnPage(page, href) {
    let $ = cheerio.load(page);
    let status = $('.pp_status').text();
    let noProfileElem = $('.service_msg').text();
    let errorElem = $('.service_msg_error').text();
    if(errorElem){
        console.log(`new request for ${href}`);
        makeRequest(href);
        return;
    }
    //console.log(page);
    if (status) {
        console.log(status, href);
        fs.appendFile('statuses.txt', `${status} : ${href} \n`, (err) => {
            if (err) throw err;
            console.log('The "data to append" was appended to file!');
        });
    } else if (noProfileElem) {
        console.log(noProfileElem, href)
    } else {
        console.log(`empty status ${href}`);
    }


    let regexp = /работа(ю)?(ет)? ((\d{1,2}:?-?)?\d{2} ?-?(\d{1,2}:?-?)?\d{2})?/i;
    if (regexp.test(status)) {

        saveData({
            "lastPageNumber": pageNumber, "findedPages": {
                status: status,
                href: href
            }
        });
    }
}

function saveData(props) {
    let jsonData = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

    for (let name in props) {
        if (name == "findedPages") { //here need to add data
            jsonData.findedPages.push(props[name]);
        }
        else
            jsonData[name] = props[name]; //and here data is replacing
    }
    fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 2));
}


process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
        saveData({"lastPageNumber": pageNumber});
        console.log(`last page number is: ${pageNumber}`);
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));