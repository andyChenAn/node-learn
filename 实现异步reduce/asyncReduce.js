// 方式1
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

// 方式2
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