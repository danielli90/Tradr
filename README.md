Tradr
=====

Simple stock trading bot built with Node and usses the Tradeking API. Stocks are traded based on the slope of an exponential moving average (EMA) of the stock price. When the slope goes from negative, to positive, that is a buy singal. When it goes from positive to negativeg, that is a sell signal.

[DanielLi] This trading bot writtine in javascript (Node.js), is a good starting point for java-based trading bot project. Added comments to the project, to prepare for the conversion to java-based trading bot.

References -

1. javascript is different from java, for example, Array in javascript supports Push and Pop, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push;
2. java equivalent can be found by a simple search. For example - 
    -  https://stackoverflow.com/questions/4537980/equivalent-to-push-or-pop-for-arrays
    -  https://stackoverflow.com/questions/8452672/java-howto-arraylist-push-pop-shift-and-unshift
3. Tradr uses day-trader stragies - SMA and EMA for the trade. The concept of SMA and EMA are explained in https://www.investopedia.com/articles/active-trading/120315/adjusting-strategies-moving-average-slopes.asp;
4. SMA and EMA calculations are explained in 
    - http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:moving_averages
    - http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:slope
5. Tradr calls TradingKing API. TradingKing is acquired by Ally Bank and renamed to Ally Investment. Fortunately, the API is still supported, as long as you have Ally Investment account - 
    - [tradingKing.js](./tradingking.js)
    - https://www.ally.com/api/invest/documentation/market-ext-quotes-get-post/
6. [app.js](./app.js) is the main program of Tradr - the magic starts here.
