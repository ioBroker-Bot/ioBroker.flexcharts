/*
    Scripts for integration tests of flexcharts adapter
    ===================================================

    Ref.: Integration test script 'test_charts.sh'

*/

// 20.03.2025   MyHomeMyData

var strify = require('javascript-stringify');
// Ref.: https://github.com/blakeembrey/javascript-stringify

/*
    Script for testing of function definition within chart definition

    chart == "chart1"    => Forward JS object. Get's implicitly stringified. Function definition get's lost.
    chart == "chart2"    => Forward JS object as String. Function definition keeps included.

*/

// 20.03.2025   MyHomeMyData

onMessage('flexcharts', (httpParams, callback) => {
    const myJsonParams  = (httpParams.myjsonparams ? JSON.parse(httpParams.myjsonparams) : {} );
    console.log(`httpParams = ${JSON.stringify(httpParams)}`);
    console.log(`myJsonParams = ${JSON.stringify(myJsonParams)}`);
    const chart = (myJsonParams.chart ? myJsonParams.chart : 'chart1');
    chart1(result => callback(result), chart);
});

function chart1(callback, chart) {
    const option = {
        tooltip: {
        trigger: "axis",
        valueFormatter: (value) => value.toFixed(2)
        },
        legend: {},
        xAxis: [{type: "category", data: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}],
        yAxis: [{type: "value"}],
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
    switch (chart) {
        case 'chart1':
            callback(option);       // Forward JS object. Get's implicitly stringified. Function definition get's lost.
            break;
        case 'chart2':
            callback(strify.stringify(option)); // Forward JS object as String. Function definition keeps included.
            break;
        default:
            callback({});
    }
}

/*
   Create combined chart on adapter flexcharts
   Show dynamically changing pie chart based on mouse selection of line chart
   Show usage of functions within chart definition
  
   Preconditions:
    * Adapter flexcharts (version 0.4.0 or newer) is running.
    * In configuration of instance 0 of javascript adapter a additional npm module "javascript-stringify" was added 
    * This script is running on instance 0 of javascript adapter, i.e. on javascript.0
  
   Uses Apache ECharts: https://echarts.apache.org/en/index.html
   Based on example chart "share dataset": https://echarts.apache.org/examples/en/editor.html?c=dataset-link

   Use following http addressin browser or iFrame:
   http://localhost:8082/flexcharts/echarts.html?source=script&message=demo_share_dataset

   Adapt 'localhost' and '8082' according to your needs
*/

// 14.03.2025   MyHomeMyData

onMessage('demo_share_dataset', (httpParams, callback) => {
    demo_share_dataset(result => callback(result));
});

function demo_share_dataset(callback) {
  const option = {
    legend: {},
    tooltip: { trigger: 'axis', showContent: false },
    dataset: {
      source: [
        ['product', '2012', '2013', '2014', '2015', '2016', '2017'],
        ['Milk Tea', 56.5, 82.1, 88.7, 70.1, 53.4, 85.1],
        ['Matcha Latte', 51.1, 51.4, 55.1, 53.3, 73.8, 68.7],
        ['Cheese Cocoa', 40.1, 62.2, 69.5, 36.4, 45.2, 32.5],
        ['Walnut Brownie', 25.2, 37.1, 41.2, 18, 33.9, 49.1]
      ]
    },
    xAxis: { type: 'category' },
    yAxis: { gridIndex: 0 },
    grid: { top: '55%' },
    series: [
      { type: 'line', smooth: true, seriesLayoutBy: 'row', emphasis: { focus: 'series' }},
      { type: 'line', smooth: true, seriesLayoutBy: 'row', emphasis: { focus: 'series' }},
      { type: 'line', smooth: true, seriesLayoutBy: 'row', emphasis: { focus: 'series' }},
      { type: 'line', smooth: true, seriesLayoutBy: 'row', emphasis: { focus: 'series' }},
      { type: 'pie', id: 'pie', radius: '30%', center: ['50%', '25%'], emphasis: { focus: 'self' }, label: { formatter: '{b}: {@2012} ({d}%)'},
            encode: { itemName: 'product', value: '2012', tooltip: '2012' }}
    ]
  };
  // Define event handler function:
  const onEvent = "myChart.on('updateAxisPointer',function(e){let t=e.axesInfo[0];if(t){let i=t.value+1;myChart.setOption({series:{id:'pie',label:{formatter:'{b}: {@['+i+']} ({d}%)'},encode:{value:i,tooltip:i}}})}});";
  callback([strify.stringify(option), onEvent]);    // Hand over definition of chart and definition of event handler function as array of Strings to flexcharts
}
