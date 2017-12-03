<template lang='jade'>
#chartWrapper(v-bind:class='{ clickable: !isClicked }')
  .shield(v-on:click.prevent='click')
  svg#chart(width='100%', :height='height')
</template>

<script>

import chart from '../../../d3/techan-chart'
import { draw as drawMessage, clear as clearMessage } from '../../../d3/message'

const MIN_CANDLES = 4;

export default {
  props: ['data', 'height', 'config'],

  data: function() {
    return {
      isClicked: false
    }
  },

  watch: {
    data: function() { this.render() },
  },

  created: function() { setTimeout( this.render, 100) },
  beforeDestroy: function() {
    this.remove();
  },

  methods: {
    click: function() {
      this.isClicked = true;
    },
    render: function() {
      this.remove();


      if(_.size(this.data.candles) < MIN_CANDLES) {
        drawMessage('Not enough data to spawn chart');
      } else {
        chart(this.data.candles, this.data.trades, this.data.indicatorResults, this.height, this.config);
      }
    },
    remove: function() {
      d3.select('#chart').html('');
    }
  }
}
</script>

<style>

#chart {
  background-color: #fff;
  width: 100%;
}

text {
    font: 10px sans-serif;
    fill: #000;
}

text.symbol {
    fill: #BBBBBB;
}

path {
    fill: none;
    stroke-width: 1;
}

path.candle {
    stroke: #000000;
}

path.candle.body {
    stroke-width: 0;
}

path.candle.up {
    fill: rgba(0, 170, 0, 0.15);
    stroke-width: 1;
    stroke: #00AA00;
}

path.candle.down {
    fill: rgba(255, 0, 0, 0.5);
    stroke-width: 1;
    stroke: #FF0000;
}

.close.annotation.up path {
    fill: #00AA00;
}

path.volume {
    fill: #DDDDDD;
}

.indicator-plot path.line {
    fill: none;
    stroke-width: 1;
}

button {
    position: absolute;
    right: 110px;
    top: 25px;
}

path.macd {
    stroke: #0000AA;
}

path.signal {
    stroke: #FF9999;
}

path.zero {
    stroke: #BBBBBB;
    stroke-dasharray: 0;
    stroke-opacity: 0.5;
}

path.difference {
    fill: #BBBBBB;
    opacity: 0.5;
}

path.rsi {
    stroke: #000000;
}

path.overbought, path.oversold {
    stroke: #FF9999;
    stroke-dasharray: 5, 5;
}

path.middle, path.zero {
    stroke: #BBBBBB;
    stroke-dasharray: 5, 5;
}

.analysis path, .analysis circle {
    stroke: blue;
    stroke-width: 0.8;
}

.crosshair {
    cursor: crosshair;
}

.crosshair path.wire {
    stroke: #DDDDDD;
    stroke-dasharray: 1, 1;
}

.crosshair .axisannotation path {
    fill: #DDDDDD;
}

.tradearrow path.tradearrow {
    stroke: none;
}

.tradearrow path.buy {
    fill: #0000FF;
}

.tradearrow path.sell {
    fill: #9900FF;
}

.tradearrow path.highlight {
    fill: none;
    stroke-width: 2;
}

.tradearrow path.highlight.buy {
    stroke: #0000FF;
}

.tradearrow path.highlight.sell {
    stroke: #9900FF;
}


</style>