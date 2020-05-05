# Car accidents statistics - Czech Republic

Apify actor to download car accidents statistics in the CR from ["Centrum dopravního výzkumu"](https://nehody.cdv.cz/). The actor creates two datasets. The first one named ACCIDENTS-GPS-<ACTOR_RUN_ID> is a helper file, the second one named CAR-ACCIDENTS-STATISTICS-CZ-<ACTOR_RUN_ID> is the final one containing all data. Example dataset output is [here](https://api.apify.com/v2/datasets/SU5LbVAKqf1LUWbmS/items?format=json&clean=1)

## Input 

The following table shows specification of the actor INPUT fields as defined by its input schema. 

Field |	Type	| Description
---| ---| ---|
dateFrom|	*String*|	(required) Date from in format YYYY-MM-DD (i.e. "2020-03-01" )
dateTo|	*String*|	(required) Date from in format YYYY-MM-DD (i.e. "2020-03-31" )
areaCode|	*String*|	(required) Area code - please, find the right one at dedicated [github file](https://github.com/katacek/car-accidents-statistics-cz/blob/master/areaCodes.csv) (i.e. "3018" )

## How to run

To run the actor, you'll need an [Apify account](https://my.apify.com/). Simply create a new task for the actor by clicking the green button above, modify the actor input configuration, click Run and get your results.
Please, note that the runtime may vary depending on the time-period. For longer runs, the actor timeout must be increased in your settings. 

## API

To run the actor from your code, send a HTTP POST request to the following API endpoint: 

https://api.apify.com/v2/acts/katerinahronik~car-accidents-statistics-cz?token=<YOUR_API_TOKEN>

## CU usage 

Depends on time period - approximatelly 1CU per one area and one year.
