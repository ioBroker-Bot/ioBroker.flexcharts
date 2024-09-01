// flexchartsTemplate1.js

/*
   Create eCharts based on adapter flexcharts using data of history adapter
  
   Preconditions:
    * Adapter flexcharts is running (available via  "iob url https://github.com/MyHomeMyData/ioBroker.flexcharts")
    * This script is running on instance 0 of javascript adapter, i.e. on javascript.0
    * Historic data is organized in a daily, monthly or yearly manner, exact one data point per time period, respectively. Missing or multiple data per period may cause strange effects.
  
   Uses Apaches ECharts: https://echarts.apache.org/en/index.html

   This is a temmplate. At least:
   * check const instanceHistory
   * edit const mySeries to use your own data
   * edit const option to configure the chart 

   Use following http addresses in browser or iFrame:
   Chart of daily values starting 14 days before:  https://localhost:3100/echarts.html?message=flexchartsdemo&source=script&chart=demoChart&params={"period":"daily", "start":14}
   Adapt 'localhost' and '3100' according to your needs
   Implemented periods: "daily", "monthly", "yearly"
*/

// 31.08.2024   MyHomeMyData

const instanceHistory = 'history.0';                // Instance of history adapter to be used

const chartsDict = { demoChart:  { func: demoChart }
                                                    // Add additional charts here. You need to define corresponding function, see demoChart() for reference.
                   };

const paramKeysAllowed = ['period','start']; // List of alle allowed parameter keys given within "params={}" via http. Adapt according to your needs.

const DEBUG = 1;    // Set to non zero value to get additional log entries.

onMessage('flexchartsdemo', (data, callback) => {
    // Waiting for messages "flexchartsdemo". Will be sent by adapter flexcharts.
    // Evaluate http parameters and create requested chart
    // In case of invalid or missing parameters create demo- or error-chart
    const chart   = data.chart;
    const params  = (data.params ? JSON.parse(data.params) : {} );

    // Check paramter keys:
    for (const p of Object.keys(params)) {
        if (!paramKeysAllowed.includes(p)) {
            // Invalid parameter
            console.error('Received invalid parameter key "'+String(p)+'". Aborting.');
            if (DEBUG >0 ) console.log('Received invalid paramter key. Created error chart. Received parameters: '+JSON.stringify(params));
            errorChart(callback);
            return;
        }
    }

    // Check for valid type of chart:
    if (chart in chartsDict) {
        // Create requested chart:
        chartsDict[chart].func(params, callback);
        if (DEBUG >0 ) console.log('Created requested chart. Received parameters: '+JSON.stringify(params));
    } else {
        // Create default demo chart:
        demoChartDefault(callback);
        if (DEBUG >0 ) console.log('Unknown type of chart "'+String(chart)+'". Created default demo chart.')
    }
});

function demoChart(params, callback) {
    function doChart(mySeries, data, period, callback) {
        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow'	} },
            legend: { top: '10%' },
            title: { text: 'Chart "'+String(period)+'" created by '+scriptName+' - refer to https://github.com/MyHomeMyData/ioBroker.flexcharts', left: 'center' },
            toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, saveAsImage: {} } },
            xAxis: { type: 'time', max: 'dataMax' },
            yAxis: [
                { type: 'value', position: 'left', name: 'y-Axis stacks (unit)', alignTicks: true, axisLine: { show: true } },
                { type: 'value', position: 'right', name: 'y-Axis line (unit)', alignTicks: true, axisLine: { show: true, lineStyle: { color: '#0000ff' } } }],
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: data['dataZoom'], end: 100 }],
            series: []
        };
        for (const s of Object.values(mySeries)) {
            option.series.push({ name: s.name, type: s.type, yAxisIndex: s.yAxisIndex, color: s.color, stack: s.stack, data: data[s.set]});
        }
        callback(option);
    }
    const normalizeDict = {
            daily:    { func: getBeginOfDay,   mult: {year: 0, month: 0, day: 1} },
            monthly:  { func: getBeginOfMonth, mult: {year: 0, month: 1, day: 0} },
            yearly:   { func: getBeginOfYear,  mult: {year: 1, month: 0, day: 0} }
          };

    const mySeries = {
        daily: [ 
            { stateID: '0_userdata.0.flexcharts.a1.perDay', name: 'a1', type: 'bar',  yAxisIndex: 0, color: '#ff0000', stack: 'stack_a', set: 'a1'},
            { stateID: '0_userdata.0.flexcharts.a2.perDay', name: 'a2', type: 'bar',  yAxisIndex: 0, color: '#a30000', stack: 'stack_a', set: 'a2'},
            { stateID: '0_userdata.0.flexcharts.b1.perDay', name: 'b1', type: 'bar',  yAxisIndex: 0, color: '#00ff00', stack: 'stack_b', set: 'b1'},
            { stateID: '0_userdata.0.flexcharts.b2.perDay', name: 'b2', type: 'bar',  yAxisIndex: 0, color: '#00a300', stack: 'stack_b', set: 'b2'},
            { stateID: '0_userdata.0.flexcharts.c1.perDay', name: 'c1', type: 'line', yAxisIndex: 1, color: '#0000ff', stack: '',        set: 'line'}
        ],
        monthly: [
            { stateID: '0_userdata.0.flexcharts.a1.perMonth', name: 'a1', type: 'bar',  yAxisIndex: 0, color: '#ff0000', stack: 'stack_a', set: 'a1'},
            { stateID: '0_userdata.0.flexcharts.a2.perMonth', name: 'a2', type: 'bar',  yAxisIndex: 0, color: '#a30000', stack: 'stack_a', set: 'a2'},
            { stateID: '0_userdata.0.flexcharts.b1.perMonth', name: 'b1', type: 'bar',  yAxisIndex: 0, color: '#00ff00', stack: 'stack_b', set: 'b1'},
            { stateID: '0_userdata.0.flexcharts.b2.perMonth', name: 'b2', type: 'bar',  yAxisIndex: 0, color: '#00a300', stack: 'stack_b', set: 'b2'},
            { stateID: '0_userdata.0.flexcharts.c1.perMonth', name: 'c1', type: 'line', yAxisIndex: 1, color: '#0000ff', stack: '',        set: 'line'}
        ],
        yearly: [
            { stateID: '0_userdata.0.flexcharts.a1.perYear', name: 'a1', type: 'bar',  yAxisIndex: 0, color: '#ff0000', stack: 'stack_a', set: 'a1'},
            { stateID: '0_userdata.0.flexcharts.a2.perYear', name: 'a2', type: 'bar',  yAxisIndex: 0, color: '#a30000', stack: 'stack_a', set: 'a2'},
            { stateID: '0_userdata.0.flexcharts.b1.perYear', name: 'b1', type: 'bar',  yAxisIndex: 0, color: '#00ff00', stack: 'stack_b', set: 'b1'},
            { stateID: '0_userdata.0.flexcharts.b2.perYear', name: 'b2', type: 'bar',  yAxisIndex: 0, color: '#00a300', stack: 'stack_b', set: 'b2'},
            { stateID: '0_userdata.0.flexcharts.c1.perYear', name: 'c1', type: 'line', yAxisIndex: 1, color: '#0000ff', stack: '',        set: 'line'}
        ]
    };
    
    // Evaluate requested period. Defaults to 'daily' for missing or invalid parameter:
    const period = ((params.period) ? (params.period in normalizeDict ? params.period : 'daily') : 'daily');
    // Evaluate requested offset. Defaults to 14 for missing or invalid parameter:
    const start = (params.start ? params.start : 14);
    const tStart = getDateByOffset(new Date(), -start, normalizeDict[period].mult);
    const tStop = new Date();
    const dataDict = { cnt: 0 };    // Dict for all chart data
    for (const dataset of Object.values(mySeries[period])) {
        getHistData(instanceHistory, dataset.stateID, dataset.set, tStart, tStop, normalizeDict[period].func, function(err, set, data) {
            if (!err) {
                dataDict[set] = data;
                dataDict.cnt++;
            } else {
                console.log(JSON.stringify(err));
            }
            if (dataDict.cnt == mySeries[period].length) {
                // All data stored in dadaDict. Create the chart:
                doChart(mySeries[period], dataDict, period, callback);
            }
        });
    }

}

// Retrieve data from history adaptert:

function getHistData(idHist, id, set, tStart, tStop, normalizeDate, callback) {
    getHistory(idHist, {
        id:         id,
        start:      tStart.getTime(),
        end:        tStop.getTime(),
        ack:        true,
        count:      1000000,
        aggregate:  'none'
    }, function (err, result) {
        const data = [];
        for (const itm of Object.values(result)) {
            data.push([normalizeDate(new Date(itm.ts)), itm.val]);
        }
        callback(err, set, data);
    });
}

function getDateByOffset(d=new Date(), adder=0, mult={year: 0, month: 0, day: 1}) { return new Date(d.getFullYear()+mult.year*adder, d.getMonth()+mult.month*adder, d.getDate()+mult.day*adder); }

// Normalize dates to beginning of a period:

function getBeginOfDay(d=new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function getBeginOfMonth(d=new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function getBeginOfYear(d=new Date()) { return new Date(d.getFullYear(), 0, 1); }

// Demo chart as fall back for unkown chart type requirement:

function demoChartDefault(callback) {
    const data = [];
    for (let i = 0; i <= 100; i++) { let theta = (i / 100) * 360; let r = 5 * (1 + Math.sin((theta / 180) * Math.PI)); data.push([r, theta]); }
    const option = {
        title: { text: 'Demo Chart: Two Value-Axes in Polar', left: 'center' },
        legend: { data: ['line'], top: '5%' },
        polar: {},
        tooltip: { trigger: 'axis',axisPointer: { type: 'cross' } }, angleAxis: { type: 'value', startAngle: 0 },
        radiusAxis: {},
        series: [ { coordinateSystem: 'polar', name: 'line', type: 'line', data: data } ]
    };
    callback(option);
}

// Error chart in case of recieving invalid parameters:

function errorChart(callback) {
    const option = {
        title: { text: 'Error Chart: Received invalid http parameters. Check the log.', left: 'center' },
        data: []
    };
    callback(option);
}
