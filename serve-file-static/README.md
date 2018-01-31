# 静态文件服务器
当我们在使用express框架的时候，会使用express.static()方法来设置静态文件的存放路径，当我们访问的这个路径下的文件时，就会获取到文件里的内容。那这是怎么做到的呢？
### 如果实现一个简单的静态文件服务器？
这是比较简单的，不外乎输入一个网址，然后返回对应的内容。比如：
```
const http = require('http');
const path = require('path');
const fs = require('fs');
const server = http.createServer((req , res) => {
	const pathname = path.join(__dirname , req.url);
	fs.stat(pathname , (err , stat) => {
		if (err) {
			res.writeHead(404 , 'not found');
			res.end('not found');
		} else {
			if (stat.isFile()) {
				const readStream = fs.createReadStream(pathname , 'utf8');
				readStream.pipe(res);
			}
		}
	})
	
});

server.listen(3000 , () => {
	console.log('listening port 3000');
})
```
上面只是一个简单的静态文件服务器，主要就是当我们访问该网址，内部会获取请求的路径，然后将路径转为绝对路径，再去查看该路径是否是一个文件，如果是一个文件，那么就获取文件里面的内容，并返回给客户端。

一般情况下，我们都会设置一个存放静态文件的目录，比如：
```
const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');
const serve = serveStatic('../async' , {
	index : ['andy.txt'],
	dotfiles : 'deny'
});
const server = http.createServer((req , res) => {
	serve(req , res , finalhandler(req , res));
});
server.listen(3000 , () => {
	console.log('listening port 3000');
})
```
上面的代码，我们将静态文件存放在async目录下。
### 具体实现
```
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
```
当我们调用serveStaticFile(path)方法时，传入一个path，就是我们存放静态文件的目录。
#### 案例：

```
const Path = require('path');
const fs = require('fs');
const http = require('http');
const serveStaticFile = require('./serveStaticFile.js')

const staticFile = serveStaticFile('../cluster');

const server = http.createServer((req , res) => {
	staticFile(req , res);
});

server.listen(3000 , () => {
	console.log('listening port 3000');
})
```
**注意：这里只是简单的实现了静态文件服务器，其实里面还应该包括设置响应头字段，比如是否缓存，缓存时长，根据mime类型，返回特定类型的内容等这些都是需要去实现的，具体我们可以参考'serve-static'这个nodejs模块，里面有比较详细的说明。**
#### 结果：
[!image](https://github.com/andyChenAn/node-learn/raw/master/serve-file-static/1.png)