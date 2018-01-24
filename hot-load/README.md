# 模块热更新技术
#### 什么是热更新？
在开发环境修改代码后，不用刷新页面也可以看到修改代码后的效果。

在nodejs开发过程中，我们经常会因为要调试代码而重新去反复启动进程，这样效率是很低的，而解决这一个问题最直接和普遍的方式就是监听文件修改并且重新启动进程。

### nodejs如何解决代码热更新
[看过百度FEX团队的一篇博客](http://fex.baidu.com/blog/2015/05/nodejs-hot-swapping/)说道：在nodejs中解决热更新代码问题的关键在于以下三个问题：
1. 如何更新模块代码
2. 如何使用新模块处理请求
3. 如何释放老模块的资源

##### 如何更新模块代码？
对于nodejs来说，每个文件就是一个模块，当我们在修改文件中的代码时，其实也就是在修改模块，那么如何更新模块代码呢？这个我们要从nodejs的模块加载系统说起，我们都知道，nodejs的模块加载方式是，模块第一次加载成功后就会被缓存起来，第二次加载的时候就直接从缓存中取出，加载的模块是被缓存在require.cache中，用代码表示就是：
```
require.cache[path] = module;
```
所以我们只需要删除缓存，那么模块就会重新加载，这样就实现了nodejs的模块代码更新。就像这样：

```
delete require.cache[path];
```
我们来看个具体的例子：

index.js代码:
```
let foo = require('./foo.js');
function cleanCache (path) {
	delete require.cache[path];
};
setInterval(function () {
	cleanCache(require.resolve('./foo.js'));
	let module = require(require.resolve('./foo.js'));
	console.log(module);
} , 5000);

```
foo.js代码：
```
module.exports = 'hello andy';
```
当我们输入 node index.js命令行后，每个5秒回打印一次foo.js模块输出的内容，而当我们修改foo.js模块输出的内容时，打印的内容也会随之改变，这就说明通过这种方式可以实现模块代码更新。
##### 如何使用新模块处理请求？
当我们可以更新模块代码之后，我们还需要一个代码更新的触发机制，因为程序不知道何时去更新模块，我们可以通过监听这个文件来实现，当文件修改过，就会触发监听事件，从而去更新模块。
我们来看一个例子：

index.js代码：
```
const express = require('express');
const fs = require('fs');
const app = express();
let router = require('./router.js');
//直接将router传入到app.use()方法中，app.use()会缓存该router模块
//app.use(router);
app.use(function(req , res , next) {
    //app.use()方法会缓存之前的router模块，所以这里通过闭包的形式获得最新的router模块
    router(req , res , next);
});

app.listen(3000 , function () {
	console.log('listening port 3000');
});

fs.watch(require.resolve('./router.js') , function () {
	cleanCache(require.resolve('./router.js'));
	try {
	    //这里重新加载router模块
		router = require(require.resolve('./router.js'));
	} catch (e) {
		console.log(e);
		console.log('module update failed');
	};
});

function cleanCache (path) {
	let module = require.cache[path];
	if (module.parent) {
		module.parent.children.splice(module.parent.children.indexOf(module) , 1);
	}
	require.cache[path] = null;
};
```
router.js代码：
```
const express = require('express');
const router = express.Router();
router.use(express.static('public'));
router.get('/' , function (req , res , next) {
	res.send('hello andy');
});
module.exports = router;
```
这样当我们启动程序，打开localhost:3000页面，然后修改router模块代码，刷新页面时，就会出现最新的内容。
##### 如何释放老模块的资源？
释放老模块的资源，实际上就是确保没有对象保持模块的引用，当模块没有被引用，那么就会被标记会可回收，下次垃圾回收的时候就会释放内存。
比如，这种情况下，就会出现内容泄漏，模块一直被引用。
```
// code.js
var array = [];

for (var i = 0; i < 10000; i++) {
    array.push('mem_leak_when_require_cache_clean_test_item_' + i);
}

module.exports = array;
```
```
// app.js
function cleanCache (module) {
    var path = require.resolve(module);
    require.cache[path] = null;
}

setInterval(function () {
    var code = require('./code.js');
    cleanCache('./code.js');
}, 10);
```
从代码中没有看出来哪里有对模块的引用，但是我们看nodejs源码的时候可以看到这样一段代码：
```
  if (parent && parent.children) {
    parent.children.push(this);
  }
```
这个this指的就是当前的模块，所以这里对模块进行了引用。
那么我们可以这样做来，删除引用：
```
// app.js
function cleanCache(modulePath) {
    var module = require.cache[modulePath];
    //在module.parent对象中删除引用
    if (module.parent) {
        module.parent.children.splice(module.parent.children.indexOf(module), 1);
    }
    require.cache[modulePath] = null;
}

setInterval(function () {
    var code = require('./code.js');
    cleanCache(require.resolve('./code.js'));
}, 10); 
```
这样引用的模块的资源就得到了释放了。

所以热更新代码的时候，一定要注意的就是内存泄漏的问题，因为有可能你删除的模块的缓冲，也更新了代码，但是旧模块的引用还存在，如果比较多的话，那么占用的内存资源就大。内存泄漏的问题就更严重，这是特别需要小心的。