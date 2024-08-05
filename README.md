![Logo](admin/flexcharts-icon-small.png)
# ioBroker.flexcharts

[![NPM version](https://img.shields.io/npm/v/iobroker.flexcharts.svg)](https://www.npmjs.com/package/iobroker.flexcharts)
[![Downloads](https://img.shields.io/npm/dm/iobroker.flexcharts.svg)](https://www.npmjs.com/package/iobroker.flexcharts)
![Number of Installations](https://iobroker.live/badges/flexcharts-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/flexcharts-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.flexcharts.png?downloads=true)](https://nodei.co/npm/iobroker.flexcharts/)

**Tests:** ![Test and Release](https://github.com/MyHomeMyData/ioBroker.flexcharts/workflows/Test%20and%20Release/badge.svg)

## flexcharts adapter for ioBroker

# Basic concept
There are several adapters available to view charts within ioBroker. As far as I know, all of them are using a UI to configure content and options of the charts. Typically not all features of the used graphical sub system could be used in this way. E.g. it's not possible to view fully featured stacked charts with eChart-Adapter.

This adapter uses a different approach. It brings the complete feature set of [Apache eCharts](https://echarts.apache.org/en/index.html) to ioBroker. Take a look the [demo charts](https://echarts.apache.org/examples/en/index.html).

**There is no UI to configure any chart.** You have to define the chart yourself, the adapter takes care about visualization. You have to provide definition and content of the chart by providing the content as a json-object - in eCharts examples it corresponds to the content of variable `option`. Here's an example to make it clear. To create a stacked chart you store it's definition in an ioBroker state (json format):

```
{ "tooltip": {"trigger": "axis","axisPointer": {"type": "shadow"}},
  "legend": {},
  "xAxis": [{"type": "category","data": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}],
  "yAxis": [{"type": "value"}],
  "dataZoom": [{"show": true,"start": 0, "end": 100}],
  "series": [
    { "name": "Grid", "type": "bar", "color": "#a30000", "stack": "Supply",
      "data": [8,19,21,50,26,0,36]},
    { "name": "PV", "type": "bar", "color": "#00a300", "stack": "Supply",
      "data": [30,32,20,8,33,21,36]},
    { "name": "Household", "type": "bar", "color": "#0000a3", "stack": "Consumption",
      "data": [16,12,11,13,14,9,12]},
    { "name": "Heat pump", "type": "bar", "color": "#0000ff", "stack": "Consumption",
      "data": [22,24,30,20,22,12,25]},
    { "name": "Wallbox", "type": "bar", "color": "#00a3a3", "stack": "Consumption",
      "data": [0,15,0,25,23,0,35]}
  ]
}
```

flexchart adapter will then show this chart:
![flexcharts_stacked1](https://github.com/user-attachments/assets/7cf6dfab-ddad-4b2f-a1e1-20fa4b876b4c)

Typically you will use Blockly or javascript to create and update content of this state.

There is another possibility to directly hand over eCharts-data via callback function within javascript. For details see below.

# Getting started

### Install flexchart adapter

Presently the adapter is availabe at Github only. Best way for installation is via command line interface:
```
iob url https://github.com/MyHomeMyData/ioBroker.flexcharts.git
```
Now add an instance in ioBroker GUI. The only configuration parameter of the adapter is the port number. You may use the default value of 8200 (used in examples shown here).

### Using the adapter

Wenn adapter is running you can access it via http://localhost:8200/echarts.html (replace `localhost` by address of your ioBroker server).

You may use this address in iFrame widgets of vis or jarvis or other visualizations. Of course you can also use it directly in a browser tab.

To make it work, you have to provide additional parameters to tell the adapter about the source of data. Two options are availabe:
* `source=state` => You provide chart data in an ioBroker state (json)
* `source=script` => You provide chart data via a script (javascript or blockly)

There is a built-in demo chart available: http://localhost:8200/echarts.html?source=state&id=flexcharts.0.info.chart1

### Use ioBroker state as source for an echart

Example: `http://localhost:8200/echarts.html?source=state&id=0_userdata.0.echarts.chart1`

<!--
Would this be better to read:
Example: http://localhost:8200/echarts.html?<mark style="background-color: #ffff00">source=state</mark>&<mark style="background-color: #00c000">&id=0_userdata.0.echarts.chart1</mark>
-->

Flexcharts will evaluate state `0_userdata.0.echarts.chart1` as data for eChart. Try it: Create such a state and copy json data of example shown above (`{ "tooltip": { ...`) as state content, then access given address with a browser.

### Use javascript as source for an echart

This is a bit more complicated but much more efficient. You provide the charts data directly by your JS script which is dynamically called by flexcharts adapter.

Again it's best to explain using an example. Create a script with this content (only first JS instance (**javascript.0**) is supported, name of script doesn't matter):
```
onMessage('flexcharts', (data, callback) => {
    console.log(`data = ${JSON.stringify(data)}`);
    chart1(result => callback(result));
});

function chart1(callback) {
    const option = {
        tooltip: {trigger: "axis", axisPointer: {type: "shadow"}},
        legend: {},
        xAxis: [{type: "category", data: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}],
        yAxis: [{type: "value"}],
        dataZoom: [{show: true, start: 0, end: 100}],
        series: [
            { name: "Grid", type: "bar", color: "#a30000", stack: "Supply",
              data: [8,19,21,50,26,0,36]},
            { name: "PV", type: "bar", color: "#00a300", stack: "Supply",
            data: [30,32,20,8,33,21,36]},
            { name: "Household", type: "bar", color: "#0000a3", stack: "Consumption",
            data: [16,12,11,13,14,9,12]},
            { name: "Heat pump", type: "bar", color: "#0000ff", stack: "Consumption",
            data: [22,24,30,20,22,12,25]},
            { name: "Wallbox", type: "bar", color: "#00a3a3", stack: "Consumption",
            data: [0,15,0,25,23,0,35]}
        ]
    };
    callback(option);
}
```

Start the script and access this address in a browser: `http://localhost:8200/echarts.html?source=script`

<!--
Would this be better to read:
Start the script and access this in a browser: http://localhost:8200/echarts.html?<mark style="background-color: #ffff00">source=script</mark>
-->

Same chart should show up as in previous example.

Pls. note, **you have to use the `onMessage()` functionality to receive the trigger from the adapter**. Default vaule for the message is `flexcharts` as shown in example above. You may use different messages by providing an additional parameter, e.g. to uses message `mycharts` add `&message=mycharts` to http address: `http://localhost:8200/echarts.html?source=script&message=mycharts`

Additional paramters can be forwarded to the script and will be available within the script in variable `data`. Try following command: `http://localhost:8200/echarts.html?source=script&chart=chart1&params={"period":"daily"}`

This should give a log entry in the example script: `data = {"source":"script","chart":"chart1","params":"{\"period\":\"daily\"}"}`

I'm working on a more elaborated javascript template to simplify usage of the adapter. Stay tuned.

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.0.2 (2024-08-05)
* (MyHomeMyData) initial release

## License
MIT License

Copyright (c) 2024 MyHomeMyData <juergen.bonfert@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
