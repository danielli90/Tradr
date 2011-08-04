var tk = require('./tradeking');
var express = require('express');
var app = express.createServer();

var sma_size = 100;
var shares = 200;
var bought_at = 0;
var sold_at = 0;
var total_profit = 0;

var sma = [];
var prices = [];

var current_sma = 0;

app.get('/', function(req, res){
	var html = 'profit: '+total_profit+'<br/>';

	html += '<br/>current price: '+prices[prices.length-1];
	html += '<br/>current sma: '+current_sma;
	
	if(bought_at != 0) {
		html += '<br/>bought at: '+bought_at;	
	}

	if (sold_at != 0) {
		html += '<br/>sold at: '+sold_at;
	}

	res.send(html);
});

app.listen(3011);

function marketOpen() {
	var time = new Date();

	if(time.getHours() >= 5 && time.getHours() < 13) 
		return true;
	else
		return false;
}

function main() {
	if (!marketOpen()) {
		return;
	}

	tk.quotes(['INTC'], function(data) {
		if (data == null) {
			return;
		}

		quote = data.response.quotes.instrumentquote.quote;
		console.log("price: "+quote.lastprice);

		current_price = parseFloat(quote.lastprice);
		prices.push(current_price);

		if(prices.length >= sma_size) {
			var sum = 0;

			for(var i = prices.length - sma_size; i < prices.length; i++) {
				sum += prices[i];
			}

			current_sma = sum / sma_size;
			sma.push(current_sma);

			console.log("avg: "+current_sma);
		}

		//if((current_sma != 0) && (current_price >= current_sma && current_price >= current_sma + 0.02)) {
		if((current_sma != 0) && (current_price >= current_sma ) && (current_sma > sma[sma.length-2]) && bought_at == 0) {
			console.log("buying at "+current_price);
			bought_at = current_price;
			sold_at = 0;
		}
		
		if((current_price < sma && current_sma < sma[sma.length-2]) && current_price > bought_at) {
		//if(current_price <= sma && current_price <= sma - 0.02 && current_price > bought_at) {
		/*
		if(bought_at != 0 && 
			((current_price <= sma  || current_price - bought_at >= 0.02 || 
			(current_sma < sma[sma.length-2] && sma[sma.length-2] < sma[sma.length-3])) && 
			current_price > bought_at)) {
		*/
			var profit = (current_price * shares) - (bought_at * shares);
			total_profit += profit;

			console.log("selling at "+current_price);
			console.log("profit: "+profit);
			console.log("total profit: "+total_profit);

			bought_at = 0;
			sold_at = current_price;
		}

		if(prices.length >= 200) {
			prices = prices.slice(prices.length - sma_size, prices.length - 1);
		}
		
		if(sma.length >= 200) {
			sma = sma.slice(sma.length - sma_size, sma.length - 1);
		}
	});
}

setInterval(main, 5000);