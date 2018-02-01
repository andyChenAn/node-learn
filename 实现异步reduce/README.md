# 实现异步reduce
在看饿了么团队的关于node面试的文档中，发现有一个问题是：实现异步reduce。我们都知道数组的reduce方法就是数组中的每一个元素从左到右累加，最终将结果返回。不过这个过程是同步的，如何将这个过程变为异步的呢？
### 实现原理
其实只要让每一步的操作从同步变成异步就可以了。基本上数组其他的同步操作也都是可以这样来实现它的异步方式的。
### 具体代码
通过async/await来实现
```
Array.prototype.asyncReduce = async function (cb , initial) {
	try {
		let array = this;
		if (initial) {
			let arg1 = initial;
			await Promise.all(array.map(async function (value , index) {
				await (new Promise((resolve , reject) => {
					setTimeout(() => {
						try {
							arg1 = cb(arg1 , value , index , array);
							resolve(arg1);
						} catch (err) {
							reject(err);
						}
					} , 0)
				}));
			}))
			return arg1;
		} else {
			let arg1 = array[0];
			// 因为已经第一个元素已经是被赋值了，所以就去掉第一个元素
			array.shift();  
			await Promise.all(array.map(async function (value , index) {
				await (new Promise((resolve , reject) => {
					setTimeout(() => {
						try {
							arg1 = cb(arg1 , value , index , array);
							resolve(arg1);
						} catch (err) {
							reject(err);
						}
					} , 0)
				}));
			}));
			return arg1;
		}
	} catch (err) {
		console.log(err.message);
	}
};
```
案例：

```
const arr = [1,2,3,4,5,6];
arr.asyncReduce((arg1 , arg2) => {
	return arg1 + arg2;
})
.then(res => {
	console.log(res);
});
```
结果：

```
21
```
第二种方式是通过异步递归的方式来完成，具体代码如下：

```
function asyncReduce (arr , initial = null) {

	function iterate (res , values , index) {
		if (values.length == 1) {
			return async(res , values[0] , index);
		}
		return async(res , values[0] , index).then(res => {
			return iterate(res , values.slice(1) , index + 1);
		})
	}

	if (initial || initial === 0) {
		return iterate(initial , arr , 0)
	} else {
		return iterate(arr[0] , arr.slice(1) , 1);
	}

	function async (res , i , index) {
		return new Promise((resolve , reject) => {
			setTimeout(() => {
				resolve(res + i);
			} , 0)
		})
	}
};
```
从上面的代码中，我们可以看到数组中的每个元素的操作都是异步的。

案例：

```
const arr = [1,2,3,4,5,6];
asyncReduce(arr , 2).then(res => {
	console.log(res)
})
```
结果：

```
23
```