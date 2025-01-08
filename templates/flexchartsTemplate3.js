// flexchartsTemplate3.js

/*
   Create simple stacked bar on adapter flexcharts
   Show usage of functions within chart definition
  
   Preconditions:
    * Adapter flexcharts (version 0.3.0 or newer) is running. Adaptewr is available via  beta repository of ioBroker.
    * In configuration of instance 0 of javascript adapter a additional npm module "javascript-stringify" was added 
    * This script is running on instance 0 of javascript adapter, i.e. on javascript.0
  
   Uses Apache ECharts: https://echarts.apache.org/en/index.html

   Use following http addresses in browser or iFrame:
   http://localhost:8082/flexcharts/echarts.html?source=script&message=mystackedchart

   Adapt 'localhost' and '8082' according to your needs
*/

// 05.01.2025   MyHomeMyData

var strify = require('javascript-stringify');
// Add npm module javascript-stringify in configuration of javascript adapter!
// For further information about this module see https://github.com/blakeembrey/javascript-stringify
 
onMessage('mystackedchart', (httpParams, callback) => {
    const myJsonParams  = (httpParams.myjsonparams ? JSON.parse(httpParams.myjsonparams) : {} );
    console.log(`httpParams = ${JSON.stringify(httpParams)}`);
    console.log(`myJsonParams = ${JSON.stringify(myJsonParams)}`);
    chart1(result => callback(result));
});

function chart1(callback) {
    const option = {
        tooltip: {
            trigger: "axis",
            valueFormatter: (value) => value.toFixed(2)
        },
        legend: {},
        xAxis: [{type: "category", data: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}],
        yAxis: [{type: "value"}],
        dataZoom: [{show: true, start: 0, end: 100}],
        series: [
            { name: "Grid", type: "bar", color: "#ff9999", stack: "Supply",
              data: [8,19,21,50,26,0,36]},
            { name: "PV", type: "bar", color: "#ff0000", stack: "Supply",
              data: [30,32,20,8,33,21,36]},
            { name: "Household", type: "bar", color: "#66b3ff", stack: "Consumption",
              data: [16,12,11,13,14,9,12]},
            { name: "Heat pump", type: "bar", color: "#006cd6", stack: "Consumption",
              data: [22,24,30,20,22,12,25]},
            { name: "Wallbox", type: "bar", color: "#0000ff", stack: "Consumption",
              data: [0,15,0,25,23,0,35]}
        ]
    };
    callback(strify.stringify(option));
}