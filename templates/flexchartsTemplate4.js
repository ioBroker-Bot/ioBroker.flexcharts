// flexchartsTemplate4.js

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

var strify = require('javascript-stringify');

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
  const onEvent = 'myChart.on("updateAxisPointer",function(e){let t=e.axesInfo[0];if(t){let i=t.value+1;myChart.setOption({series:{id:"pie",label:{formatter:"{b}: {@["+i+"]} ({d}%)"},encode:{value:i,tooltip:i}}})}});';
  callback([strify.stringify(option), onEvent]);    // Hand over definition of chart and definition of event handler function as array of Strings to flexcharts
}