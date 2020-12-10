"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _jsdom = require("jsdom");

var _jquery = _interopRequireDefault(require("jquery"));

var _countryCodeLookup = _interopRequireDefault(require("country-code-lookup"));

var _sugar = _interopRequireDefault(require("sugar"));

var _reqFastPromise = require("req-fast-promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

class ReceiveSmss {
  constructor() {
    Object.defineProperty(this, '$http', {
      value: new _reqFastPromise.ReqFastPromise({
        baseURL: 'https://receive-smss.com',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        }
      })
    });
  }

  phones(filterCountry) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        var res = yield _this.$http.get('/');
        var $ = (0, _jquery.default)(new _jsdom.JSDOM(res.data).window);
        var numbers = (0, _lodash.default)($('.number-boxes .number-boxes-item')).map(div => {
          var number = $(div).find('.number-boxes-itemm-number').text();
          var country = $(div).find('.number-boxes-item-country').text();

          if (country.toLowerCase() === 'russian federation') {
            country = 'Russia';
          }

          var lookupCountry = _countryCodeLookup.default.byCountry(country);

          var countryCode;

          if (lookupCountry) {
            countryCode = lookupCountry.internet;
          }

          return {
            number,
            country,
            countryCode
          };
        }).uniq().value();
        return _lodash.default.filter(numbers, item => {
          if (!filterCountry) {
            return true;
          }

          return _lodash.default.includes(_lodash.default.filter([item.country.toLowerCase(), item.countryCode ? item.countryCode.toLowerCase() : null]), filterCountry.toLowerCase());
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }

  inbox(number) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        var index = yield _this2.$http.get('/');
        var res = yield _this2.$http.get("/sms/".concat(number.replace('+', ''), "/"), {
          cookies: index.cookies
        });
        var $ = (0, _jquery.default)(new _jsdom.JSDOM(res.data).window);
        var inboxes = (0, _lodash.default)($('.list-view tbody tr')).map(tr => {
          var sender = $(tr).find('td').eq(1).text();
          var humanized = $(tr).find('td').eq(4).text();
          var message = $(tr).find('td').eq(5).text();
          return {
            sender,
            time: {
              humanized,
              time: _sugar.default.Date.format(_sugar.default.Date.create(humanized), "{yyyy}-{MM}-{dd} {hh}:".concat(humanized.includes('day') || humanized.includes('hour') ? 'xx' : '{mm}', ":").concat(humanized.includes('day') || humanized.includes('hour') || humanized.includes('minute') ? 'xx' : '{ss}'))
            },
            message
          };
        }).value();
        return inboxes;
      } catch (e) {
        console.error(e);
      }
    })();
  }

  listen(number) {
    var _arguments = arguments,
        _this3 = this;

    return _asyncToGenerator(function* () {
      var cb = _arguments.length > 1 && _arguments[1] !== undefined ? _arguments[1] : () => {};
      var intervalDuration = _arguments.length > 2 && _arguments[2] !== undefined ? _arguments[2] : 5000;
      return new Promise( /*#__PURE__*/function () {
        var _ref = _asyncToGenerator(function* (resolve, reject) {
          var interval;
          var callback = {
            resolve(data) {
              clearInterval(interval);
              interval = null;
              resolve(data);
            },

            reject(error) {
              clearInterval(interval);
              interval = null;
              reject(error);
            }

          };
          var inboxes = yield _this3.inbox(number);
          cb(inboxes, callback);
          interval = setInterval( /*#__PURE__*/_asyncToGenerator(function* () {
            var inboxes = yield _this3.inbox(number);
            cb(inboxes, callback);
          }), intervalDuration);
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());
    })();
  }

}

exports.default = ReceiveSmss;