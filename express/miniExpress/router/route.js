const Layer = require('./layer.js');
let slice = Array.prototype.slice;
let methods = ['get' , 'post'];
function Route (path) {
    this.path = path;
    this.stack = [];
};
Route.prototype.dispatch = function (req , res) {
    let stack = this.stack;
    let index = 0;
    while (index < stack.length) {
        let layer = stack[index++];
        layer.handle_request(req , res);
    };
}
methods.forEach(function (method) {
    Route.prototype[method] = function () {
        let handles = slice.call(arguments);
        for (let i = 0 ; i < handles.length ; i++) {
            let handle = handles[i];
            if (typeof handle !== 'function') {
                throw new Error(method + '的回调必须是一个函数');
            };
            let layer = new Layer('/' , handle);
            this.stack.push(layer);
        };
    }
});
module.exports = Route;
