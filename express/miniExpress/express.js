const application = require('./application.js');
function createApplication () {
    let app = function (req , res) {
        app.handle(req , res);
    };
    Object.assign(app , application);
    return app;
};
exports = module.exports = createApplication;