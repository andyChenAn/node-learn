/* 创建一个可读流 */
const stream = require('stream');
const readable = stream.Readable();

/* 向缓存中添加数据 */
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
	//调用push方法，向缓存中添加数据
	this.push(arr.shift());
};

/* 读取数据 */
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
	this.push(arr.shift() || null);
};
// 第一种方式：通过监听data事件
readable.on('data' , chunk => {
	console.log(chunk.toString());
});

// 第二种方式：通过调用read方法
let data;
while (data = readable.read()) {
	console.log(data.toString());
}
readable.pipe(process.stdout);

// 第三种方式：通过调用resume方法，不过前面是调用了pause方法暂停了读取流中的数据，调用resume方法
// 恢复读取流中的数据
readable.pause();
readable.resume();
readable.on('data' , data => {
	console.log(data.toString());
});





