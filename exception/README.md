# 错误处理
关于nodejs的错误处理，我确实没怎么弄过，因为现在正在学习nodejs，之前也没有过任何实践，只能在网上找资料，看看别人是怎么处理的。这里主要是对网上看到的一些资料做的一些总结吧。

nodejs中的错误处理一般分为以下几种：
- **回调函数处理错误**。
- **Promise处理错误**

#### 回调函数处理错误
nodejs中我们可以发现大部分的api的回调函数都遵守first-error的风格，这是因为没办法捕获异步抛出的异常，所以将异常保存为一个变量，一层一层的往上传递。一般情况下，都是先处理err错误，比如，在express中需要将err通过next往下传递，而不能直接throw err，同时return也是一定要写的，这样出错就先返回了，不再执行后续代码。其实这里我们可以参考cnode.org社区开源的代码，也就是这样处理的。
```
const express = require('express');
const app = express();

app.use(function (req , res , next) {
	// 这里是伪代码，如果发送一个请求，但是这个请求出现异常
	request(url , function (err) {
		if (err) {
			return next(err);
		}
		// 执行后续操作
	})
})

app.listen(3000 , () => {
	console.log('listening port 3000');
})
```
#### Promise处理错误
在很早之前我们就已经开始使用promise来控制异步流程，当然我是刚用不久，主要是在开发微信小程序的时候用，毕竟可以使用es6语法嘛。
```
const fs = require('fs');
// 将异步操作封装成一个Promise对象
function readFile (path) {
	return new Promise((resolve , reject) => {
		fs.readFile(path , (err , data) => {
			if (err) {
				reject(err);
			}
			resolve(data);
		})
	})
}

// 当调用该函数时，只要读取操作出现异常，那么就会在catch中被捕获，从而进行处理
readFile('./andy.txt')
.then(result => {

})
.catch(err => {

})
```
#### co函数处理异常
co函数主要是对生成器函数进行一个包装。比如：
```
const fs = require('fs');
const co = require('co');
// 将异步操作封装成一个Promise对象
function readFile (path) {
	return new Promise((resolve , reject) => {
		fs.readFile(path , (err , data) => {
			if (err) {
				reject(err);
			}
			resolve(data);
		})
	});
};

// co函数里面我们可以直接使用try/catch捕获异步操作中的异常 
co(function* () {
	try {
		let result = yield readFile('./andy.txt');
		console.log(result);
	} catch (err) {
		console.log(err.code);
	}
});
```
#### async/await处理异常
async函数应该是对co+generator进行了内部的封装，其实调用的方式和上面的差不多。我们直接使用try/catch方式来捕获异常，然后通过next(err)，将异常传递下去。
```
const fs = require('fs');
// 将异步操作封装成一个Promise对象
function readFile (path) {
	return new Promise((resolve , reject) => {
		fs.readFile(path , (err , data) => {
			if (err) {
				reject(err);
			}
			resolve(data);
		})
	});
};

// async函数里面我们可以直接使用try/catch捕获异步操作中的异常 
async function read (path) {
	try {
		let result = await readFile(path);
		console.log(result.toString());
	} catch (err) {
		console.log(err.code);
		//next(err);
	}
};

read('./andy.txt')
```
#### 在app.js中使用app.use(errorhandler)
在app.js中使用app.use(errorhandler)，统一处理返回的err，通过header头部类型判断是否返回页面或json数据或其他类型。其实就是每个中间件函数中，如果有遇到异常，都会调用next(err)，将异常传递下去，最终都会到app.use(errorhandler)这里进行统一处理。我们可以参考cnode社区的源码：
```
// error handler
if (config.debug) {
  app.use(errorhandler());
} else {
  app.use(function (err, req, res, next) {
    logger.error(err);
    return res.status(500).send('500 status');
  });
}
```