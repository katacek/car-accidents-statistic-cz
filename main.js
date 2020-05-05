const Apify = require('apify');
const cheerio = require("cheerio");
const moment = require('moment');
const fetch = require('node-fetch');

async function tableTojson(table,$)
{
    let tableHeader = $('td.caption', table).map(function ()
    {
        return $(this).text();
    }).get();
    
    let tableData = $('td:not(.caption)', table).map(function ()
    {
        return $(this).text();
    }).get();

    const jsonResult = {}
    for (let i = 0; i < tableHeader.length; i++)
    {
        jsonResult[tableHeader[i]] = tableData[i];
    }

    return jsonResult;
}

Apify.main(async () => {

// const input = {
//         dateFrom: '2020-03-20',
//         dateTo: '2020-03-20',
//         areaCode: 3018
//     }

const input = await Apify.getValue('INPUT');

// create dataset / variable to store get accidents ids 
    const actorRunId = Apify.getEnv('APIFY_ACTOR_RUN_ID').actorRunId;
    console.log(actorRunId)
    const dataset = await Apify.openDataset(`ACCIDENTS-GPS-${actorRunId}`);
    const from = moment(input.dateFrom);
    const to = moment(input.dateTo);
    const areaCode = parseInt(input.areaCode);
    console.log(from)
    console.log(to)
    console.log(areaCode)
    let actual = moment(from);
    let actualStr = '';
    let actualToStr = '';

    let gpsAll = [];
    let resultAll = 0;

    const datasetCheck = await dataset.getData()
    
    if (datasetCheck.items.length === 0) {
        while (actual.isSameOrBefore(to) )
        {
            // from to in the same month and year
            if (moment(from).endOf('month').isSame(moment(to).endOf('month'))){
                actualStr = from.format('YYYY-MM-DD');
                actualToStr = to.format('YYYY-MM-DD');
                actual.add(1, 'month').startOf('month');;
            }
            // from to in different month, to not the end of month
            else if (!moment(to).isSame(moment(to).endOf('month'))){
                actualStr = actual.format('YYYY-MM-DD');
                // while end of actual month is before to
                if (moment(actual).endOf('month').isBefore(to)){
                    actualToStr = moment(actual).endOf('month').format('YYYY-MM-DD');
                    actual.add(1, 'month').startOf('month');
                } else {
                actualToStr = to.format('YYYY-MM-DD');
                actual.add(1, 'month').startOf('month');
                }
            }
            // from to in different month, to is the end of month
            else {
                actualStr = actual.format('YYYY-MM-DD');
                actualToStr = moment(actual).endOf('month').format('YYYY-MM-DD');
                actual.add(1, 'month').startOf('month');
            };
            
            let response =
                await fetch("https://nehody.cdv.cz/handlers/loadMap.php", {
                    "headers": {
                        "accept": "application/json, text/javascript, */*; q=0.01",
                        "accept-language": "cs,en;q=0.9,en-US;q=0.8,es;q=0.7,de;q=0.6,ru;q=0.5,sk;q=0.4,pl;q=0.3",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-requested-with": "XMLHttpRequest"
                    },
                    "referrer": "https://nehody.cdv.cz/statistics.php",
                    "referrerPolicy": "no-referrer-when-downgrade",
                    "body": `span=day&dateFrom=${actualStr}&dateTo=${actualToStr}&types%5B%5D=nehody&area%5Bcode%5D=${areaCode}&extent%5Bnortheast%5D%5Blat%5D=51&extent%5Bnortheast%5D%5Blng%5D=19&extent%5Bsouthwest%5D%5Blat%5D=48.5&extent%5Bsouthwest%5D%5Blng%5D=11.5&zoom=10&layers%5BaccidentType%5D=accidents-injury&layers%5BaccidentDetail%5D%5B%5D=accidents-injury-death&layers%5BaccidentDetail%5D%5B%5D=accidents-injury-heavy&layers%5BaccidentDetail%5D%5B%5D=accidents-injury-light&layers%5BaccidentDetail%5D%5B%5D=accidents-injury-no`,
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include"
                });
            

            // as a response, we get the json with accident id, lt, lg 
            
            let json = await response.json();
            let gpsData = json.data;

            gpsAll = gpsAll.concat(gpsData)
            resultAll += gpsData.length;
            console.log(`From ${actualStr} to ${actualToStr} get ${gpsData.length} accidents, all count now: ${resultAll}`);

        }

    await dataset.pushData(gpsAll);
    console.log(`From ${from} to ${to} pushed ${resultAll} accidents`);
    }
     
    const dataset2 = await Apify.openDataset(`ACCIDENTS-GPS-${actorRunId}`);
    const datasetValues = await dataset2.getData();

    // accident id is under p1 key
    const urlList = datasetValues.items.map(x => (`https://nehody.cdv.cz/detail.php?p1=${x.p1}`));
    console.log(urlList.length);

    // on apify app change request list to this:
    const requestList = await Apify.openRequestList('urlList', urlList);

    console.log('request list opened')
   
    const datasetDetail = await Apify.openDataset(`CAR-ACCIDENTS-STATISTICS-CZ-${actorRunId}`);
                
    const basicCrawler = new Apify.BasicCrawler({
        requestList,
        handleRequestFunction: async ({ request }) => {
            const { body } = await Apify.utils.requestAsBrowser({ url: request.url });
            //const { body } = await Apify.utils.requestAsBrowser({url: 'https://nehody.cdv.cz/detail.php?p1=2100203100' });
            
            const $ = await cheerio.load(body);

            const jsonAll = {};
            const jsonIdAll = {};

            //const table = $('h2:contains(Nehoda)').closest('div').find('table');
            const tableMain = $('h2:contains(Nehoda)').closest('div').find('table').eq(0);
            const tableMainjson = await tableTojson(tableMain, $);
            tableMainjson['gps'] = {};
           
            for (item of datasetValues.items) {
                if (item.p1 == tableMainjson['ID nehody']) {
                    tableMainjson.gps['lat'] = item.lat;
                    tableMainjson.gps['lng'] = item.lng;
                };
            }
            
            jsonAll['tableMain'] = tableMainjson;

            const tableDetail = $('#accident-detail');        
            const tableDetailjson = await tableTojson(tableDetail, $);           
            jsonAll['tableDetail'] = tableDetailjson;

            let i = 1;
            while ($(`#vehicle-${i}`).text()!='')
            {
                let tableCar = $(`#vehicle-${i}`).find('table');
                let tableCarjson = await tableTojson(tableCar, $);
                let personDiv = $(`#vehicle-${i}`).next();

                let id = personDiv.attr('id');
                while (id != undefined && id.includes('person'))
                {
                    let personTable = personDiv.find('table')
                    let jsonPerson = await tableTojson(personTable, $);
                    tableCarjson[`${id}`] = jsonPerson;
                    personDiv = personDiv.next();
                    id = personDiv.attr('id');
                }

                jsonAll[`tableCar${i}`] = tableCarjson;
                i++
            }         
                        
            jsonIdAll[tableMainjson['ID nehody']] = jsonAll;
          
            await datasetDetail.pushData(jsonIdAll);
           
            console.log('url pushed: '+ request.url)

        },

        handleFailedRequestFunction: async ({ request }) => {
            await Apify.pushData({
                '#isFailed': true,
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    await basicCrawler.run();

  })

// list of all areas for input

   // const response = await fetch("https://nehody.cdv.cz/handlers/loadAreas.php?term=", {
    //   "headers": {
    //     "accept": "application/json, text/javascript, */*; q=0.01",
    //     "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    //     "sec-fetch-dest": "empty",
    //     "sec-fetch-mode": "cors",
    //     "sec-fetch-site": "same-origin",
    //     "x-requested-with": "XMLHttpRequest",
    //     "cookie": "_ga=GA1.2.5776441.1587367536; _gid=GA1.2.543825703.1588077121; _gat=1"
    //   },
    //   "referrer": "https://nehody.cdv.cz/statistics.php",
    //   "referrerPolicy": "no-referrer-when-downgrade",
    //   "body": null,
    //   "method": "GET",
    //   "mode": "cors"
    // });
