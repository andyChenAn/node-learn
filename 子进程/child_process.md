# child_process
### spawn方法和exec方法的区别是什么？
spawn方法会返回一个带有stdout和stderr流的对象，你可以通过stdout流来读取子进程中的数据，stdout继承了stream，所以具有流的事件，当你想要子进程返回大量数据给父进程的时候，比如图像处理，读取二进制数据等，那么最好使用spawn方法。

spawn方法返回的子进程，在子进程开始执行的时候，它就开始从一个流将数据从子进程返回给父进程。

exec方法返回的子进程，它一定要等到子进程运行结束以后然后一次性返回所有的数据，如果exec设置的maxBuffer太小，会报Error：maxBuffer exceeded错误。

**所以，当你想从子进程中返回大量数据的时候就应该使用spawn方法，而如果只是从子进程返回简单的数据，那么就使用exec方法（因为exec方法中，创建的子进程返回的数据最多不能超过200k，如果超过，那么会报Error：maxBuffer exceeded错误）。**

### execFile()和exec()的区别？
execFile方法与exec方法类似，但是execFile方法不会衍生一个shell，而是可执行的文件被直接衍生为一个新的进程，所以这使得它要比execFile方法更高效，但是因为没有衍生shell，所以不支持像I/O重定向和文件查找这样的行为。
### spawn方法
spawn方法有一个配置项是stdio，该配置选项用于配置子进程与父进程之间建立的管道。有三个值可以选择:'pipe' , 'inherit' , 'ignore'。
1. pipe：默认值，默认情况下，子进程的stdin、stdout和stderr会重定向到子进程对象上的subprocess.stdin、subprocess.stdout，subprocess.stderr流。所以我们使用spawn方法执行一些命令后，返回的数据都可以使用childprocess.stdout.on('data')事件上读取到。
```
const {spawn} = require('child_process');
const child = spawn('ls' , {
	stdio : 'pipe'
});
child.stdout.on('data' , (data) => {
	console.log(data.toString());
});
```
2. inherit：表示子进程继承主进程的stdin、stdout和stderr。这就造成子进程的数据事件处理器在主进程的process.stdout流上被触发，使得脚本立即输出结果。
```
const {spawn} = require('child_process');
const child = spawn('ls' , {
	stdio : 'inherit'
});
//直接就打印结果了
```
3. ignore：表示忽略子进程与主进程的管道。一般如果我们需要将子进程和主进程分离的话，那么我们就需要设置这个。

主进程代码：index.js
```
const {spawn} = require('child_process');
const child = spawn('node timer.js' , {
	stdio : 'ignore',
	shell : true,
	detached : true
});
child.unref();
```
子进程代码：timer.js
```
setTimeout(() => {
	
} , 20000)
```
当我们执行主进程的时候，我们通过ps -ef | grep timer.js这个命令可以查看子进程是否还在执行（确实在运行，即使主进程已经退出），结果为：
```
501   650     1   0 12:13上午 ??         0:00.06 node timer.js
501   652   548   0 12:13上午 ttys000    0:00.00 grep timer.js
```
### 主进程和子进程分离
主进程和子进程分离要将一个配置项detached设置为true，然后stdio设置为ignore，然后子进程调用unref()方法。
```
const {spawn} = require('child_process');
const child = spawn('node timer.js' , {
	stdio : 'ignore',
	shell : true,
	detached : true
});
child.unref();
```
我们可以断开与主进程之间的管道，同时我们也可以将io重定向到其他文件，比如：

主进程代码：index.js
```
const {spawn} = require('child_process');
const fs = require('fs');
const out = fs.openSync('./out.log' , 'a');
const child = spawn('node timer.js' , {
	stdio : ['ignore' , out , 'ignore'],
	shell : true,
	detached : true
});
child.unref();
```
子进程代码：timer.js
```
//这里主要是将子进程的输出的数据重定向到了out.log文件中
setTimeout(() => {
	process.stdout.write('hello world');
} , 5000)
```
### fork方法
我们也可以使用fork方法来创建子进程，这个方法时spawn函数针对衍生node进程的一个变种。spawn和fork最大的区别在于，使用fork时，子进程会有一个额外的内置的通信通道，它允许消息在父进程和子进程之间来回传递。因此我们可以在fork出来的进程上使用send函数，这些进程上有个全局process对象，可以用于父进程和fork进程之间传递消息。比如：
父进程代码：index.js
```
const {fork} = require('child_process');
const forked = fork('timer.js');
forked.send('hello world');
forked.on('message' , (msg) => {
	console.log(msg);
})
```
子进程代码：timer.js
```
process.on('message' , (msg) => {
	console.log(msg);
})
let count = 0;
setInterval(() => {
	process.send(count++);
} , 1000)
```
### 计算密集的处理方式
其实nodejs是适合高并发，但是不适合处理计算密集的场景，由于计算密集的场景都会阻塞后续代码执行，但是如果遇到这样的时候，我们应该如何处理呢？

常用的方式就是将计算密集的那一部分代码通过fork方法放到另一个子进程中，子进程和父进程通过send和监听message事件的方式来通信，这样计算密集的那部分代码就不会阻塞父进程后续代码的执行。比如：
父进程代码：index.js
```
const http = require('http');
const {fork} = require('child_process');
const forked = fork('timer.js');
const server = http.createServer((req , res) => {
	if (req.url === '/compute') {
		forked.send('start');
		forked.on('message' , (msg) => {
			res.end(`Sum is ${msg}`);
		})
	} else {
		res.end('ok');
	}
});
server.listen(3000 , () => {
	console.log('listening port 3000');
})
```
子进程代码：timer.js
```
//通过for循环来模拟计算密集情况
const longCompute = () => {
	let sum = 0;
	for (let i = 0 ; i < 1e9 ; i++) {
		sum += i;
	}
	return sum;
}
process.on('message' , (msg) => {
	const sum = longCompute();
	process.send(sum);
})
```
再来看一个比较完整的代码实现：

```
const cp = require('child_process');
function doWork (job , cb) {
	const child = cp.fork('./worker');
	let cbTriggered = false;
	child
	.once('error' , (err) => {
		if (!cbTriggered) {
			cb(err);
			cbTriggered = true;
		};
		child.kill();
	})
	.once('exit' , (code , signal) => {
		if (!cbTriggered) {
			cb(new Error('child exited with code: ' + code));
		}
	})
	.once('message' , (result) => {
		cb(null , result);
		cbTriggered = true;
	})
	child.send(job);
}
doWork('hello child' , (err , result) => {
	if (err) {
		console.log(err.code);
	} else {
		console.log(result);
	}
});
```

### 执行Node程序
我们可以创建一个可执行的文件用来执行node程序。
1. 在windows平台下做可执行文件

创建一个index.bat文件，并输入内容:
```
@echo off
node "child.js" %*
```
创建一个child.js文件：
```
process.stdout.write('hello wrold');
```
创建一个index.js文件：
```
const {execFile} = require('child_process');
execFile('index.bat' , ['andy'] , (err , stdout , stderr) => {
	console.log(stdout);
})
```
这样当我们执行node index.js文件时，就会执行index.bat文件。
2. 在UNIX平台下做可执行文件

创建一个index.js文件：
```
#!/usr/bin/env node   //告诉脚本通过node来执行
console.log('hello andy');
```
然后在命令行输入：
```
chmod +x index.js //改变index.js文件的权限，添加执行的权限
```
然后我们直接在命令行中输入：node index.js即可。
### 工作池

```
const cp = require('child_process');
const cpus = require('os').cpus().length;
module.exports = function (workModule) {
	let awaiting = [];
	let readyPool = [];
	let poolSize = 0;
	return function doWork (job , cb) {
		if (!readyPool.length && poolSize > cpus) {
			return awaiting.push([doWork , job , cb]);
		}
		let child = readyPool.length ? readyPool.shift() : (poolSize++ , cp.fork(workModule));
		let cbTriggered = false;
		child
		.removeAllListeners()
		.once('error' , (err) => {
			if (!cbTriggered) {
				cb(err);
				cbTriggered = true;
			}
			child.kill();
		})
		.once('exit' , (code , signal) => {
			if (!cbTriggered) {
				cb(new Error('child exited with code : ' + code));
			}
			poolSize--;
			let childIndex = readyPool.indexOf(child);
			if (childIndex > -1) {
				readyPool.splice(childIndex , 1);
			}
		})
		.once('message' , (msg) => {
			cb(null , msg);
			cbTriggered = true;
			readyPool.push(child);
			console.log(poolSize);
			if (awaiting.length) {
				setImmediate.apply(null , awaiting.shift());
			}
		})
		.send(job)
	}
}
```
