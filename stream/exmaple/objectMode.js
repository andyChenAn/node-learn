// 可读流中的objectMode模式下：
const Readable = require('stream').Readable;
const arr = [
	{name : 'andy' , age : 23},
	{name : 'jack' , age : 12},
]
const readable = new Readable({
	objectMode : true,
	read : function (size) {
		this.push(arr.shift() || null);
	}
});
readable.on('data' , data => {
	console.log(data);
});
readable.on('end' , () => {
	console.log('数据已经读取完成');
});

// 可读流中的非objectMode模式下：
const Readable = require('stream').Readable;
const arr = ['alex' , 'andy'];
const readable = new Readable({
	objectMode : false,
	read : function (size) {
		this.push(arr.shift() || null);
	}
});
readable.on('data' , data => {
	console.log(data);
});
readable.on('end' , () => {
	console.log('数据已经读取完成');
});

// 可写流中的objectMode模式下：
const Writable = require('stream').Writable;
const writable = new Writable({
	objectMode : true,
	write : function (chunk , encoding , callback) {
		console.log(chunk);
		callback();
	}
});
writable.write(undefined);
writable.write({name : 'andy'});
writable.write([1,2,3]);
writable.write([{name : 'andy'} , 2 , 'jack' , function () {} , undefined , null])
writable.end();

// 可写流中的非objectMode模式下：
const Writable = require('stream').Writable;
const writable = new Writable({
	objectMode : true,
	write : function (chunk , encoding , callback) {
		console.log(chunk);
		callback();
	}
});
writable.write('andy');
writable.write('alex');
writable.end();