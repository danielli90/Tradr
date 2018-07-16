var os = require('os');
var tk = require('./tradeking');
var db = require('./db');
var phone = require('./phone');
var express = require('express');
var app = express.createServer();

console.log("Starting up");

process.stdout.on('drain', function(){
	os.freemem();
});

/************************************************
 * Send errors to my phone
 ************************************************/
process.on('uncaughtException', function(err) {
	console.log("uncaughtException: "+err);
	phone.sendError(err);
});

/*
 * [JavaProject] stocks to watch and purchase defined in watch and shares Array
 */
/************************************************
 * Stocks to collect data for and stocks to trade
 ************************************************/
var watch = ['CRZO', 'JOYG', 'DDD', 'PIR', 'ABB', 'BAC', 'AMD', 'F', 'MGM', 'NVDA', 'SD', 'HTZ', 'CAR', 'LVS', 'TSM', 'YHOO', 'AA', 'SCHW', 'XRX', 'DEO'];
var shares= {'CRZO': 60, 'JOYG':24, 'DDD': 100, 'PIR': 200, 'ABB': 50, 'BAC': 260, 'AMD':320, 'F':180, 'MGM':172, 'NVDA':148, 'SD':266, 'HTZ':184, 'CAR': 200, 'LVS':67, 'TSM':200,
						 'YHOO': 150, 'AA':150, 'SCHW':150, 'XRX': 250, 'DEO':50};

var portfolio = {};
var transactions = [];

var sma_size = 20;

var market_open = false;

var port = 3011;

var now;

app.use(express.bodyParser());

/************************************************
 * Simple Web interface
 ************************************************/
app.get('/', function(req, res){
	var profit = 0;
	var html = '<html><head>';
	
	html += '<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js" type="text/javascript"></script>';
	html += '<script src="/trade.js" type="text/javascript"></script></head><body><table>';
	
	for(var i=0; i<watch.length;i++) {
		data = portfolio[watch[i]];
		profit += data.profit;
		html += '<tr id="'+watch[i]+'"><td><a href="https://www.etrade.wallst.com/v1/stocks/charts/charts.asp?symbol='+watch[i]+'">'+watch[i]+'</a></td><td>profit:</td><td>'+data.profit+'</td>'
		html += '<td>bought at:</td><td>'+data.bought_at+'</td><td>current:</td><td>'+data.current_price+'</td>';
		html += '<td><button onclick="sell(\''+watch[i]+'\')">Sell</button></td></tr>';
	}

	html += '</table>'
	html += '<br/><br/>profit: '+profit+'<br/>';
	html += '<br/>transactions: <br/>';

	for(var i=0; i<transactions.length-1;i++){
		html += transactions[i]+'<br/>';
	}

	html += '<br/>Total commision: '+transactions.length*5;
	html += '</body></html>';

	res.send(html);
});

app.post('/sell', function(req, res) {
	var data = portfolio[req.body.ticker];

	if(data.bought_at != 0) {
		sellStock(data);
	}
});

app.get('/*.*', function(req, res){res.sendfile("./static"+req.url);});

app.listen(port);

function marketClosed() {
	var time = new Date();

	if(time.getHours() >= 13) 
		return true;
	else
		return false;
}

function sellTime() {
	var time = new Date();
	
	if(time.getHours() >= 12 && time.getMinutes() >= 30) 
		return true;
	else
		return false;
}

function sellStock(data) {
	/*
	 * [JavaProject] update ticker object in portfolior, calculating profit
	 */
	var profit = (data.current_price * data.shares) - (data.bought_at * data.shares);
	data.profit += profit;

	/*
	 * [JavaProject] Trasaction book-keeping, for debuggign bot-behahior. Instead of "db.addTrasaction", 
	 *   JavaProject can simply print the transaction to the console. One can load the output to an excel spreadsheet for
	 *   offline analysis later.
	 */
	transactions.push('selling '+data.shares+' of '+data.sym+' at '+data.current_price+' with '+data.profit+' profit');
	db.addTransaction(ticker, "SELL", data.bought_at, data.current_price, data.shares, now);

	data.bought_at = 0;
}

/************************************************
 * Trading logic
 ************************************************/
function trade(ticker, quote) {
	if(portfolio[ticker] == null) {
		/*
		 * [JavaProject] protofolio is an array of ticker object; every ticker object consists of child objects below, tracks
		 *   EMA (Exponential Moving Average), Slopes, purchaing and selling prices of a ticker.
		 */
		portfolio[ticker] = {'sma':[], 
			        'prices':[], 
					'slopes':[],
					'bought_at':0,
					'sold_at':0,
				    'profit':0,
					'current_sma':0,
		            'current_price':0,
					'shares':shares[ticker],
					'sym':ticker,
					'last_vol':0};
	}

	data = portfolio[ticker];

	//calc volume since last tick
	data.last_vol = quote.extendedquote.volume - data.last_vol;

	var current_price = parseFloat(quote.lastprice);
	var slope = null;

	data.current_price = current_price;
	data.prices.push(current_price);
		
	/*
	 * [JavaProject] After collecting 20 price points (sma_size is defined as 20 here), start calculating first true
	 *   SMA (Simplified Moving Average), explained in 
	 *   http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:moving_averages
	 */
	//figure out SMA
	if(data.prices.length == sma_size) {
		var sum = 0;

		for(var i = data.prices.length - sma_size; i < data.prices.length; i++) {
			sum += data.prices[i];
		}

		data.current_sma = sum / sma_size;
		data.sma.push(data.current_sma);

	// EMA
	} else if(data.sma.length >= 1) { 
		/*
		 * [JavaProject] After one true SMA (Simplified Moving Average) is available, starts EMA calculation and saves
		 *   EMA to the data.sma array (the name of the array is misleading now).
		 *   EMA calculation is explained in http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:moving_averages
		 */
		current_sma = (2/(sma_size+1)) * (current_price - data.current_sma) + data.current_sma;
		data.sma.push(data.current_sma);
	}

	/* 
	 * [JavaProject] Per http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:slope, the slope calculation
	 *   is a linear regression of EMA points. The calculation below seems a simplified version of linear regression (?)
	 */
	//calculate slope
	if(data.sma.length >= 10) {
		slope = ((data.sma[data.sma.length-1] - data.sma[data.sma.length-10]) / 10) * 100;
		data.slopes.push(slope);
	}
	
	var buy = false;
	var sell = false;

	/*
	 * [JavaProject] Buy and Sell decisions by EMA Slope
	 */
	if(slope > 0.18) {
		buy = true;
	}

	if(slope < 0) {
		sell = true;
	}

	/*
	 * [JavaProject] "db" is Node.js specific. JavaProject may want to dump the result to console,
	 *   to achieve the same effect as "db" - to monitor Tradr behavior; the output to console can be dumped
	 *   to a file, for offline analysis later.
	 */
	db.addPrice(ticker, current_price, now, data.last_vol);

	/*
	 * [JavaProject] 330 price points/quota. Because Tradr loads price point/quota every minute,
	 *   330 minutes cover 5.5 hours of stock market open - from 9:30am to 16:00pm EST.
	 *   A ticker/stock can only be purchased if it hasn't been bought in the day.
	 */
	//buy 
	if(buy && data.bought_at == 0 && data.prices.length < 330) {
		/*
		 * [JavaProject] when buying a stock, it buys a fixed shares of any specific symbol, defined at array shares above
		 */
		transactions.push('buying '+data.shares+' of '+data.sym+' at '+data.current_price);
		data.bought_at = current_price;
		/*
		 * [JavaProject] Transaction is tracked, for book-keeping and debugging of the bot behavior. Instead of 
		 *   "db.addTrasaction", JavaProject can simply print the transaction to the console. One can load the output to an excel spreadsheet for
	         *   offline analysis later.
		 */
		db.addTransaction(ticker, "BUY", data.bought_at, null, data.shares, now);
	}

	/*
	 * [JavaProject] A ticker/stock can only be sold, if it has been bought in the day, and its purchase price is lower than
	 *   current price, so a profit can be made. Rule#1 - don't lose moeny; Rule#2 - refers to rule#1.
	 */
	//sell
	if((data.bought_at !=0 && current_price > data.bought_at) && (sell || sellTime())) {
		sellStock(data);
	}
}

/*
 * [JavaProject] getQuotes() gets the prices (quotes) and then does the trade
 */
function getQuotes() {
	tk.quotes(watch, function(data) {
		if (data == null || data.response == null || data.response.quotes == null) {
			console.log("oops, our api call returned nil");
			getQuotes();
			return;
		}

		// loop thru the stock symbols and does the trade
		for(var i=0; i<data.response.quotes.instrumentquote.length;i++) {
			instrument = data.response.quotes.instrumentquote[i]
			quote = instrument.quote
			ticker = instrument.instrument.sym;
			trade(ticker, quote);
		}
	});
}

/************************************************
 * Main loop
 ************************************************/
function main() {
	now = new Date();
	
	//dont trade mid minute
	if(now.getSeconds() == 0) {
		if(market_open) {
			/* 
			 * [JavaProject] getQuotes() gets the prices (quotes) and then does the trade
			 */
			getQuotes(); 

			if(marketClosed())
				market_open = false;
		} else {
			/* 
			 * [JavaProject] if market is closed, tk.marketStatus() calls into TradingKing API and see if market is open
			 */
			tk.marketStatus(function(data) {
				var s = data.response.status.current;

				if(s == "open") {
					market_open = true;
					/* 
					 * [JavaProject] getQuotes() gets the prices (quotes) and then does the trade
					 */
					getQuotes(); 
				}
			});
		}
	}
}

main();
/*
 * [JavaProject] checking-quota every 1 second.
 */
setInterval(main, 1000);
