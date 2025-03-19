#!/bin/bash

# Integration tests for flexcharts
#
# Using port 8082 as default. Port number may be specified as parameter-
#
# Usage: ./test_charts.sh [port]

# MyHomeMyData  2025.03

function test_curl()  {
    # Get data from flexcharts via curl and evaluate result
    # Assign parameter:
    title="$1"      # Title of test case
    addr="$2"       # Server address
    fname="$3"     # File name. Content shall match result of curl

    echo -n "$title ... " 
    echo "" > .result       # clear result file
    curl -s "$addr" > .result
    ec="$?"
    if [ "$ec" = "0" ]
    then
        if [ "$(diff -q .result $EXPECT$fname)" ]
        then
            # Files are different!
            echo -e "\033[1m\033[31mNOK! Result does not match expectation.\033[0m"
            echo "$title ... NOK! Result does not match expectation:" >> "$LOG"
            echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" >> "$LOG"
            echo $(diff .result "$fname") >> "$LOG"
            echo "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<" >> "$LOG"
            ec="111"
        else
            echo -e "\033[32mOK\033[0m"
            echo "$title ... OK" >> "$LOG"
        fi
    else
        echo -e "\033[1m\033[31mNOK! curl returned error code $ec\033[0m"
    fi

    if [ "$ec" = "0" ]
    then
        CNT_OK=$(($CNT_OK + 1))
    else
        CNT_NOK=$(($CNT_NOK + 1))
    fi

    return $ec
}

LOG="test_charts.log"
EXPECT="expect/"    # sub folder for expected data
CNT_OK=0        # Counter tests passed
CNT_NOK=0       # Counter tests failed

echo "$(date '+%Y-%m-%d %H:%M:%S') $0 integration test started." > "$LOG"

# Evaluation optional parameter: Port number:
PORT="8082"
if [ "$1" != "" ]
then
    PORT="$1"
fi

# Initial test:
test_curl "Check for default chart" "http://localhost:$PORT/flexcharts/echarts.html" "builtin.chart.default"
ec="$?"
if [ "$ec" != "0" ]
then
    # Test failed. Most propably server is not reachable
    echo -e "\033[1m\033[31mFatal error. Error code=$ec. Aborting.\033[0m"
    echo -e "Fatal error. Error code=$ec. Aborting." >> "$LOG"
    exit $ec
fi 

# Do the testing:
test_curl "Check for page 404" "http://localhost:$PORT/flexcharts/echart.html" "chart.404"
test_curl "Check for flexcharts.0.info.chart2" "http://localhost:$PORT/flexcharts/echarts.html?source=state&id=flexcharts.0.info.chart2" "info.chart2.default"
test_curl "Check for flexcharts.0.info.chart2 dark mode" "http://localhost:$PORT/flexcharts/echarts.html?source=state&id=flexcharts.0.info.chart2&darkmode" "info.chart2.dark"
test_curl "Check for flexcharts.0.info.chart3 using onEvent function" "http://localhost:$PORT/flexcharts/echarts.html?source=state&id=flexcharts.0.info.chart3" "info.chart3.default"

# Check for number of failed tests and finalize
if [ "$CNT_NOK" != "0" ]
then
    NOK="\033[1m\033[31m"
    OK=""
    ec="0"
else
    FAIL=""
    OK="\033[1m\033[32m"
    ec="112"
fi
echo -e "\n$OK$CNT_OK tests passed and $NOK$CNT_NOK tests failed\033[0m"
echo "$CNT_OK tests ok and $CNT_NOK tests failed" >> "$LOG"

echo "$(date '+%Y-%m-%d %H:%M:%S') $0 integration test finished." >> "$LOG"

exit "$ec"
