function serveStaticFile (path) {
	return function (req , res) {
		let pathname = decodeURIComponent(req.url);
		path = Path.resolve(path);
		pathname = Path.join(path , pathname);
		fs.stat(pathname , (err , stat) => {
			// 如果读取的文件或目录不存在
			if (err && err.code === 'ENOENT') {
				res.writeHead(404 , 'Not Found');
				return res.end(err.message)
			}
			// 如果是一个文件，那么直接读取文件的内容并返回给客户端
			if (stat.isFile()) {
				let readStream = fs.createReadStream(pathname , 'utf8');
				res.writeHead(200 , 'ok');
				readStream.pipe(res);
			}
			// 如果是一个目录，那么就看这个目录下面有没有'index.html'
			// 如果没有，这表示没有这个文件
			// 如果有，则输出这个文件的内容
			if (stat.isDirectory()) {
				const p = Path.join(pathname , 'index.html');
				fs.stat(p , (err , stat) => {
					if (err && err.code === 'ENOENT') {
						res.writeHead(404 , 'Not Found');
						return res.end(err.message)
					}
					let readStream = fs.createReadStream(p , 'utf8');
					res.writeHead(200 , 'ok');
					readStream.pipe(res);
				})
			}
		})
	}
};

module.exports = serveStaticFile;
