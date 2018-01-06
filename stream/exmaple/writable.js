const stream = require('stream');
const writable = new stream.Writable();
const fs = require('fs');
writable._write = function (chunk , encoding , callback) {
	fs.writeFile('./andy.txt' , chunk + '\n' , {flag : 'a+'} , (err) => {
		console.log('写入文件完成');
	});
	callback();
};
writable.on('finish' , () => {
	console.log('数据已经全部写入到底层系统');
});
writable.on('drain' , () => {
	console.log('写入的数据超过了警戒线');
});
writable.write('andychen');
writable.write('jack');
writable.write('alex');
writable.end();