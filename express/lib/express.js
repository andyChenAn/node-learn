/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */

var bodyParser = require('body-parser')
var EventEmitter = require('events').EventEmitter;
var mixin = require('merge-descriptors');
var proto = require('./application');
var Route = require('./router/route');
var Router = require('./router');
var req = require('./request');
var res = require('./response');

/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 * 创建一个express应用对象
 * createApplication其实就是一个工厂函数，在函数内部创建一个对象，并初始化该对象，然后返回该对象
 * @return {Function}
 * @api public
 */

function createApplication() {
	var app = function(req, res, next) {
	app.handle(req, res, next);
	};
	// 合并对象的属性和方法
	mixin(app, EventEmitter.prototype, false);
	mixin(app, proto, false);

// expose the prototype that will get set on requests
app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
})

// expose the prototype that will get set on responses
app.response = Object.create(res, {
app: { configurable: true, enumerable: true, writable: true, value: app }
})

// 初始化application对象
app.init();
return app;
}

/**
 * Expose the prototypes.
 */

exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */

exports.Route = Route;
exports.Router = Router;

/**
 * Expose middleware
 */

exports.json = bodyParser.json
exports.query = require('./middleware/query');
exports.static = require('serve-static');
exports.urlencoded = bodyParser.urlencoded

/**
 * Replace removed middleware with an appropriate error message.
 */

;[
  'bodyParser',
  'compress',
  'cookieSession',
  'session',
  'logger',
  'cookieParser',
  'favicon',
  'responseTime',
  'errorHandler',
  'timeout',
  'methodOverride',
  'vhost',
  'csrf',
  'directory',
  'limit',
  'multipart',
  'staticCache',
].forEach(function (name) {
	Object.defineProperty(exports, name, {
		get: function () {
			throw new Error('Most middleware (like ' + name + ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.');
		},
		configurable: true
	});
});
