import React, { useState } from 'react';
import moment from 'moment';
import { VictoryBar, VictoryBrushContainer, VictoryChart, VictoryLine, VictoryTooltip, VictoryZoomContainer } from 'victory';

import { locale } from '../locale';

moment.locale(locale.getLanguage());

const currencyFormat = new Intl.NumberFormat(locale.getLocale(), { style: 'currency', currency: locale.getCurrency() });

export default function Transactions(props) {
  const {
    transactions,
    transactionAggregates
  } = props;

  const [selectedDomain, setSelectedDomain] = useState();
  const [zoomDomain, setZoomDomain] = useState();

  const handleZoom = (domain) => {
    setSelectedDomain(domain);
  };
  const handleBrush = (domain) => {
    setZoomDomain(domain);
  };

  return <>
    <VictoryChart
      scale={{ x: "time" }}
      crossAxis={true}
      containerComponent={
        <VictoryZoomContainer
          zoomDimension="x"
          zoomDomain={zoomDomain}
          onZoomDomainChange={handleZoom.bind(this)}
        />
      }>
      <VictoryLine
        data={transactionAggregates.monthly}
        x={d => moment(d.date).toDate()}
        y="goal"
        style={{ data: { stroke: "red" } }}
        labels={d => d.datum.goal}
        labelComponent={<VictoryTooltip renderInPortal/>}/>
      <VictoryBar
        data={transactionAggregates.monthly}
        x={d => moment(d.date).toDate()}
        y="total_price"
        style={{ data: { fill: "navy", width: 10 } }}
        labels={d => moment(d.datum.date).format('MMM YYYY')+' '+currencyFormat.format(d.datum.total_price)}
        labelComponent={<VictoryTooltip renderInPortal/>}/>
      <VictoryBar
        data={transactions}
        x={d => moment(d.date).toDate()}
        y="total_price"
        labels={d => moment(d.datum.date).format('LLL')+' '+currencyFormat.format(d.datum.total_price)}
        style={{ data: { fill: "seagreen", width: 10 } }}
        labelComponent={<VictoryTooltip renderInPortal/>}/>
    </VictoryChart>
    <VictoryChart
      height={100}
      padding={{top: 0, left: 50, right: 50, bottom: 30}}
      scale={{x: "time"}}
      containerComponent={
        <VictoryBrushContainer
          brushDimension="x"
          brushDomain={selectedDomain}
          onBrushDomainChange={handleBrush.bind(this)}
        />
      }>
      <VictoryLine
        style={{
          data: {stroke: "tomato"}
        }}
        data={transactionAggregates.monthly}
        x={d => moment(d.date).toDate()}
        y="total_price"/>
    </VictoryChart>
  </>
}
