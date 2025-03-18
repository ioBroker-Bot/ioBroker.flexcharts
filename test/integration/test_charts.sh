#!/bin/bash

# Integration tests for flexcharts
#
# Prerequesite:
#   * ioBroker running as docker compose image with name iobroker

# Install flexcharts adapter

# To be implemented

# Test for chart

echo -e "Check for flexcharts.0.info.chart2"
docker compose exec iobroker curl -s "http://localhost:8082/flexcharts/echarts.html?source=state&id=flexcharts.0.info.chart2" > .result
diff -qs .result info.chart2.default

# Test for chart in dark mode

echo -e "\nCheck for flexcharts.0.info.chart2 in dark mode"
docker compose exec iobroker curl -s "http://localhost:8082/flexcharts/echarts.html?source=state&id=flexcharts.0.info.chart2&darkmode" > .result
diff -qs .result info.chart2.dark
