/**
 * @author by andyChen
 * @date 2017-01-03
 */

/* 使用fs.readFile方式来读取文件 */
console.time();
console.log('读取数据之前：' + process.memoryUsage().rss);
fs.readFile('jquery.js' , (err , data) => {
	console.timeEnd();
	console.log('读取数据之后：' + process.memoryUsage().rss);
});


/* 使用可读流的方式来读取文件 */
console.time();
console.log('读取数据之前：' + process.memoryUsage().rss);
const readable = fs.createReadStream('jquery.js');
let m = 0;
readable.on('data' , data => {
	if (m == 1) {
		return;
	};
	m++;
	console.timeEnd();
});
readable.on('end' , () => {
	console.log('读取数据之后：' + process.memoryUsage().rss);
});