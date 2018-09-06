const Route = require('./route.js');
const Layer = require('./layer.js');
function Router () {
    this.stack = [];
};
Router.prototype.route = function (path) {
    let route = new Route(path);
    let layer = new Layer(path , route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
};
Router.prototype.handle = function (req , res) {
    let path = req.url;
    let index = 0;
    let stack = this.stack;
    let match;
    while (index < stack.length) {
        let layer = stack[index++]
        match = this.matchLayer(path , layer);
        if (match !== true) {
            continue;
        };
        layer.handle_request(req , res);
    };
};
Router.prototype.matchLayer = function (path , layer) {
    if (layer.path == path) {
        return true;
    }
    return false;
}
module.exports = Router;