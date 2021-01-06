import moment from 'moment';
import React, { useState } from 'react';
import { VictoryBar, VictoryBrushContainer, VictoryChart, VictoryLine, VictoryScatter, VictoryTooltip, VictoryZoomContainer } from 'victory';
import { locale } from '../locale';


moment.locale(locale.getLanguage());

const numberFormat = new Intl.NumberFormat(locale.getLocale());

export default function Transactions(props) {
  const {
    transactions,
    transactionAggregates,
    selectedAttribute,
    attributeGoals
  } = props;

  const monthlyAggregates = Object.values(transactionAggregates.monthly);

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
      containerComponent={
        <VictoryZoomContainer
          zoomDimension="x"
          zoomDomain={zoomDomain}
          onZoomDomainChange={handleZoom}
        />
      }>
      <VictoryLine
        data={monthlyAggregates}
        x={d => moment(d.date).toDate()}
        y={d => d.attributes[selectedAttribute.id]}
        style={{ data: { stroke: "navy" } }}/>
      <VictoryScatter
        data={monthlyAggregates}
        x={d => moment(d.date).toDate()}
        y={d => d.attributes[selectedAttribute.id]}
        style={{ data: { fill: "navy", width: 10 } }}
        labels={d => `${moment(d.datum.date).format('MMM YYYY')} ${locale.getNameLocale(selectedAttribute.name)} ${numberFormat.format(d.datum.attributes[selectedAttribute.id])}`}
        labelComponent={<VictoryTooltip renderInPortal/>}/>
      <VictoryBar
        data={transactions}
        x={d => moment(d.date).toDate()}
        y={d => d.attributes[selectedAttribute.id]}
        labels={d => `${moment(d.datum.date).format('LLL')} ${locale.getNameLocale(selectedAttribute.name)} ${numberFormat.format(d.datum.attributes[selectedAttribute.id])}`}
        style={{ data: { fill: "seagreen", width: 10 } }}
        labelComponent={<VictoryTooltip renderInPortal/>}/>
      {attributeGoals[selectedAttribute.id] && <VictoryLine
        data={monthlyAggregates}
        x={d => moment(d.date).toDate()}
        y={() => attributeGoals[selectedAttribute.id]}
        style={{ data: { stroke: "red" } }}/>}
    </VictoryChart>
    <VictoryChart
      height={100}
      padding={{top: 0, left: 50, right: 50, bottom: 30}}
      scale={{x: "time"}}
      containerComponent={
        <VictoryBrushContainer
          brushDimension="x"
          brushDomain={selectedDomain}
          onBrushDomainChange={handleBrush}
        />
      }>
      <VictoryLine
        style={{
          data: {stroke: "tomato"}
        }}
        data={monthlyAggregates}
        x={d => moment(d.date).toDate()}
        y={d => d.attributes[selectedAttribute.id]}/>
    </VictoryChart>
  </>
}
