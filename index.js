'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createValidate = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// React PropTypes have different function signature, handle edge-case
var handlePropTypes = function handlePropTypes(f) {
  return function (v, k, values) {
    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      args[_key - 3] = arguments[_key];
    }

    return f.name === 'bound checkType' ? _lodash2.default.get(f(values, k, 'redux-validate', 'prop'), 'message') : f.apply(undefined, [v, k, values].concat(args));
  };
};

var thenable = function thenable(blueprint) {
  var stack = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  return function () {
    for (var _len2 = arguments.length, raw = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      raw[_key2] = arguments[_key2];
    }

    var inner = function inner() {
      for (var _len3 = arguments.length, argsRaw = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        argsRaw[_key3] = arguments[_key3];
      }

      return _lodash2.default.thru(argsRaw.length <= 1 ? [argsRaw, {}] : [argsRaw.slice(0, -1), _lodash2.default.last(argsRaw)], function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var args = _ref2[0];
        var current = _ref2[1];
        return stack.concat(blueprint.apply(undefined, raw)).reduce(function (c, f, i) {
          return _lodash2.default.defaults(f.apply(undefined, _toConsumableArray(args).concat([c])), i && c);
        }, current);
      });
    };
    inner.then = thenable(blueprint, stack.concat(blueprint.apply(undefined, raw)));
    return inner;
  };
};

var createValidate = exports.createValidate = function createValidate(df) {
  var testAll = function testAll(lo, f, args) {
    return lo.mapValues(function (v, k) {
      return handlePropTypes(f || df).apply(undefined, [v, k].concat(_toConsumableArray(args)));
    }).pickBy().value();
  };

  return thenable(function (reqs, func) {
    return function (values) {
      for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }

      return typeof reqs === 'function' ? reqs.apply(undefined, [values].concat(args)) : !reqs ? testAll(_lodash2.default.chain(values), func, [values].concat(args)) : reqs instanceof Array ? testAll(_lodash2.default.chain(values).pick(reqs), func, [values].concat(args)) : _lodash2.default.isPlainObject(values) ? _lodash2.default.chain(values).pick(_lodash2.default.keys(reqs))
      // use identity for non-functions
      .mapValues(function (v, k) {
        return [v, typeof reqs[k] === 'function' ? reqs[k] : function (_v) {
          return !_v && reqs[k];
        }];
      }).mapValues(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2);

        var v = _ref4[0];
        var f = _ref4[1];
        return [v, handlePropTypes(f)];
      }).mapValues(function (_ref5, k) {
        var _ref6 = _slicedToArray(_ref5, 2);

        var v = _ref6[0];
        var f = _ref6[1];
        return f.apply(undefined, [v, k, values].concat(args));
      }).pickBy().value() : {};
    };
  });
};

exports.default = createValidate(function (v, k) {
  return !v && _lodash2.default.startCase(k) + ' is required';
});