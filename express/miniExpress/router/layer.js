function Layer (path , handle) {
    this.path = path;
    this.handle = handle;
};
Layer.prototype.handle_request = function (req , res) {
    let fn = this.handle;
    fn(req , res);
};
module.exports = Layer;