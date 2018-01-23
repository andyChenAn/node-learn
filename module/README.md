## 模块加载
在nodejs中，所有的文件都被视为一个模块，那么模块具体是怎么加载的呢？

在编写nodejs代码时，我们都会调用一个require方法，将文件的路径作为参数传入，这样nodejs就加载了这个文件，我们来看一下具体是怎么实现的？

#### 第一：
调用require方法加载模块，实际上是调用内部的require方法，调用该方法，其实内容主要是先判断文件路径是否存在以及是否为一个字符串，然后再调用内部的_load方法来加载文件。
```
// Loads a module at the given file path. Returns that module's
// `exports` property.
Module.prototype.require = function(path) {
  assert(path, 'missing path');
  assert(typeof path === 'string', 'path must be a string');
  return Module._load(path, this, /* isMain */ false);
};
```

#### 第二：
调用_load方法，主要做了以下几件事情：
```
Module._load = function (request , parent , isMain) {

	//第一步：计算该文件的绝对路径
	var filename = Module._resolveFilename(request, parent, isMain);

	//第二步：如果有缓存，取出缓存，返回缓存的模块实例的exports属性
	var cachedModule = Module._cache[filename];
	if (cachedModule) {
		updateChildren(parent, cachedModule, true);
		return cachedModule.exports;
	};
	
	//第三步：判断是否为内置模块，比如,http等，如果是，则加载内置模块
	if (NativeModule.nonInternalExists(filename)) {
		debug('load native module %s', request);
		return NativeModule.require(filename);
	};

	//第四步：创建模块实例
	var module = new Module(filename, parent);

	//第五步：设置缓存
	Module._cache[filename] = module;

	//第六步：加载模块
	tryModuleLoad(module, filename);

	//第七步：输出模块的exports属性
	return module.exports;
};
```
这里需要强调一下，在计算文件的绝对路径的时候，里面主要调用到_findPath方法，该方法就是用来查找文件的绝对路径，主要分为以下几种情况：
1. 有缓存，直接取缓存。
2. 如果是文件，会按照.js,.json,.node顺序来找，只要找到就返回。
3. 如果是目录，会按照目录下是否有package.json文件，并且该文件是否存在main字段，如果不存在，则会依次查看该目录下的index.js,index.json,index.node，只要找到就返回。
4. 如果有找到，那么就缓存这个绝对路径，并返回这个路径。
所以首先就是要确定文件的绝对路径，只有确定了文件路径，才能在接下来的步骤中去加载模块。
#### 第三：
加载模块，其实就是首先是通过调用fs.readFileSync()方法来读取文件里的内容，然后根据不同的文件名后缀去编译文件内容。
1. 加载js文件内容：调用_compile()方法
```
module._compile(internalModule.stripBOM(content), filename);
```
```
if (inspectorWrapper) {
result = inspectorWrapper(compiledWrapper, this.exports, this.exports,require, this, filename, dirname);
} else {
result = compiledWrapper.call(this.exports, this.exports, require, this,filename, dirname);
}
```
上面这段代码就类似于：
```
(function (exports, require, module, __filename, __dirname) {
  // 模块源码
});
```
[引用阮一峰大神](http://www.ruanyifeng.com/blog/2015/05/require.html)的一句话，加载模块的实质就是，注入exports,require,module三个变量，然后执行模块的代码，然后将exports属性的值输出。
2. 加载json文件内容：调用JSON.parse()方法将json字符串，转为json对象。直接输出。

```
module.exports = JSON.parse(internalModule.stripBOM(content));
```
3. 加载后缀名为node的文件：
```
Module._extensions['.node'] = function(module, filename) {
  return process.dlopen(module, path.toNamespacedPath(filename));
};
```
## 模块循环引用问题
模块循环引用，比如，a.js模块内require('./b.js')，而b.js模块内require('./a.js')，当执行a.js模块时，就会造成模块循环引用。那nodejs解决循环引用问题的方式就是，当出现循环引用的时候，会返回一个a.js模块的exports对象的"未完成副本"给b.js，然后b.js模块完成加载，并将exports对象提供给a.js模块，这样就解决了循环引用问题，而这都依赖于nodejs的模块缓存，所有的模块都会在第一次加载后被缓存，所以当我们再加载该模块的时候，其实就是直接从缓存中获取的。
比如：
foo.js
```
console.log('foo模块开始加载...');
exports.done = false;
const bar = require('./bar.js');
console.log('在foo模块中，bar.done=' + bar.done);
exports.done = true;
console.log('foo模块加载完成');
```
bar.js
```
console.log('bar模块开始加载...');
exports.done = false;
const foo = require('./foo.js');
console.log('在bar模块中，foo.done=' + foo.done);
exports.done = true;
console.log('bar模块加载完成');
```
index.js
```
console.log('主模块开始加载...');
const foo = require('./foo.js');
const bar = require('./bar.js');
console.log('主模块中的foo模块和bar模块加载完成 , foo.done='+foo.done+'，bar.done='+bar.done);
```
结果为：
```
主模块开始加载...
foo模块开始加载...
bar模块开始加载...
在bar模块中，foo.done=false
bar模块加载完成
在foo模块中，bar.done=true
foo模块加载完成
主模块中的foo模块和bar模块加载完成 , foo.done=true，bar.done=true
```
## AMD,CMD,CommonJS的区别
##### CommonJS规范：
一个文件就是一个模块，以同步的方式加载模块，模块第一次加载之后，会被缓存，之后再加载同一个模块，则会直接从缓存中获取，CommonJS规范一般用于服务器端，比如nodejs，因为文件都是放在服务器端，所以加载速度是很快的。
##### AMD规范：
AMD表示异步模块定义，也就是说模块是通过异步的方式来加载，模块的加载不影响后面代码的执行，主要用于浏览器端，比如require.js。
##### CMD规范：
CMD表示通用模块定义，也是通过异步的方式加载模块，和require.js类似，不过CMD对于依赖的模块是延迟执行的，AMD是提前执行。主要用于浏览器端，比如sea.js。