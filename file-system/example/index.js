const fs = require('fs');
const Database = require('./database.js');
const client = new Database('./test.db');
client.on('load' , function () {
	let foo = client.get('foo');
	console.log(foo)
	client.set('bar' , 'fdasfas' , function (err) {
		if (err) {
			throw err;
		}
		console.log('write successful');
	});
});
client.on('error' , function (msg) {
	console.log(msg)
})