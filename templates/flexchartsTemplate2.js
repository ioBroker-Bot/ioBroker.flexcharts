// flexchartsTemplate2.js

/*
   Create simple line chart based on adapter flexcharts using data of history adapter
  
   Preconditions:
    * Adapter flexcharts (version 0.1.6 or newer) is running. Adaptewr is available via  beta repository of ioBroker.
    * This script is running on instance 0 of javascript adapter, i.e. on javascript.0
  
   Uses Apache ECharts: https://echarts.apache.org/en/index.html

   This is a temmplate. At least:
   * check const instanceHistory
   * edit const mySeries to use your own data
   * edit const option to configure the chart
   * adapt function getTsStart()

   Use following http addresses in browser or iFrame:
   http://localhost:8082/flexcharts/echarts.html?source=script&message=mylinechart

   Adapt 'localhost' and '8082' according to your needs
*/

// 06.11.2024   MyHomeMyData

const instanceHistory = 'influxdb.0';                // Instance of history adapter to be used

const tsScriptStart = new Date().getTime();          // Remember time stamp of start of this script

onMessage('mylinechart', (httpParams, callback) => {
    // Waiting for messages "mylinechart". Will be sent by adapter flexcharts.
    lineChart(callback);
});

function lineChart(callback) {
    function doChart(data, callback) {
        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow'	} },
            legend: { top: '10%' },
            title: { text: 'My line chart '+' created by '+scriptName+' - refer to https://github.com/MyHomeMyData/ioBroker.flexcharts', left: 'center' },
            toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, saveAsImage: {} } },
            xAxis: { type: 'time' },
            yAxis: [
                { type: 'value', position: 'left', name: 'y-Axis (unit)', axisLine: { show: true } }],
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: data['dataZoom'], end: 100 }],
            series: []
        };
        for (const s of Object.values(mySeries)) {
            option.series.push({ name: s.name, type: s.type, yAxisIndex: s.yAxisIndex, color: s.color, stack: s.stack, data: data[s.set]});
        }
        callback(option);
    }

    const mySeries = [ 
            { stateID: '0_userdata.0.flexcharts.mylinechartdata', set: 'line1', name: 'line 1', type: 'line', color: '#ff0000'}
            // Optionaly add more data sets here
            ];
    
    const tsStart = getTsStart();
    const tsStop  = new Date().getTime();
    const dataDict = { cnt: 0 };    // Dict for all chart data
    for (let i=0; i<mySeries.length; i++) {
        getHistData(instanceHistory, mySeries[i].stateID, mySeries[i].set, tsStart, tsStop, function(err, set, data) {
            if (!err) {
                dataDict[set] = data;
                dataDict.cnt++;
            } else {
                console.log(JSON.stringify(err));
            }
            if (dataDict.cnt == mySeries.length) {
                // All data stored in dadaDict. Create the chart:
                doChart(dataDict, callback);
            }
        });
    }

}

// Return desired time stamp for starting time of chart

function getTsStart() {
    return tsScriptStart-1*24*3600*1000;   // Start 1 day before start of this script
}

// Retrieve data from history adaptert:

function getHistData(idHist, id, set, tsStart, tsStop, callback) {
    getHistory(idHist, {
        id:         id,
        start:      tsStart,
        end:        tsStop,
        ack:        true,
        count:      1000000,
        aggregate:  'none'
    }, function (err, result) {
        const data = [];
        for (const itm of Object.values(result)) {
            data.push([new Date(itm.ts), itm.val]);
        }
        callback(err, set, data);
    });
}
