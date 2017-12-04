/*

  RSI - cykedev 14/02/2014

  (updated a couple of times since, check git history)

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var RSI = require('./indicators/RSI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.name = 'RSI';
  this.sl = 5; // stoploss should be 10%

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false,
    tradeprice: 0 
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', this.settings);
}

// for debugging purposes log the last
// calculated parameters.
method.log = function(candle) {
  // var digits = 8;
  // var rsi = this.indicators.rsi;

  // log.debug('calculated RSI properties for candle:');
  // log.debug('\t', 'rsi:', rsi.result.toFixed(digits));
  // log.debug('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function(candle) {
  var rsi = this.indicators.rsi;
  var rsiVal = rsi.result;
  
  
  
  if ( this.trend.tradeprice && 
    this.trend.adviced == 2 && 
    ((this.trend.tradeprice/(100 + this.sl))*100).toFixed(4) > candle.close.toFixed(4) 
  ) { // SL
    
    log.debug('go short at SL:');
    log.debug('\t', '         rsi:', rsi.result.toFixed(8));
    log.debug('\t', '          sl:', this.sl);
    log.debug('\t', '      buy at:', this.trend.tradeprice.toFixed(4));
    log.debug('\t', 'sl should be:', ((this.trend.tradeprice/(100 + this.sl))*100).toFixed(4));
    log.debug('\t', '       close:', candle.close.toFixed(4));

    this.trend.adviced = 1;
    this.advice('short');
    this.trend.tradeprice = 0;

  } else if (rsiVal > 0 && rsiVal > this.settings.thresholds.high) {

    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: 0,       // 0 = none, 1 = short, 2 = long
        tradeprice: 0 
      };

    this.trend.duration++;

    log.debug('In high since', this.trend.duration, 'candle(s) rsi:', rsi.result.toFixed(8));

    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && this.trend.adviced != 1) {
      this.trend.adviced = 1;
      this.trend.tradeprice = candle.close;
      this.advice('short');
      log.debug('go short at:');
      log.debug('\t', 'rsi:', rsi.result.toFixed(8));
      
    } else
      this.advice();

  } else if(rsiVal > 0 && rsiVal < this.settings.thresholds.low) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: 0,
        tradeprice: 0 
      };

    this.trend.duration++;

    log.debug('In low since', this.trend.duration, 'candle(s) rsi: ', rsi.result.toFixed(8));

    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && this.trend.adviced != 2) {
      this.trend.adviced = 2;
      this.trend.tradeprice = candle.close;
      this.advice('long');
      log.debug('go long at:');
      log.debug('\t', 'rsi:', rsi.result.toFixed(8));
    } else
      this.advice();

  } else {
    // if(rsiVal > 0) {
    //   log.debug('In no trend');
    // }

    this.advice();
  }
}

module.exports = method;
