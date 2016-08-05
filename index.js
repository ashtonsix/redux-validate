'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validate = exports.defaultValidate = exports.createValidate = exports.get = exports.traverse = exports.toPath = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Converts:
// 'alpha.[5].child[marvelous].sausage'
// and:
// ['giant.flamingo', ['alpha', 'will', [['beta[6]']]], 'croissant']
// into something like:
// ['giant', 'flamingo', 'alpha', 'will', 'beta', '6', 'croissant']
var toPath = exports.toPath = function toPath(str) {
  if (str instanceof Array) return str.length <= 1 ? toPath(str[0]) : _lodash2.default.flatten(str.map(toPath));
  if (str == undefined) return []; // eslint-disable-line eqeqeq
  str = str.toString();
  var bracketedParts = (str.match(/\[\w*\]/g) || ['']).map(function (s) {
    return s === '[]' ? s : s.slice(1, -1);
  });
  var path = _lodash2.default.flatten(_lodash2.default.zip(str.split(/\[\w*\]/), bracketedParts)).filter(function (part) {
    return !!part;
  });
  path = _lodash2.default.flatten(path.map(function (part) {
    return part.split('.');
  })).filter(function (part) {
    return !!part;
  });
  return path;
};

// 'Accepts[ugly]', ['paths.and', 'outputs'] 'normal.paths.like.this'
var normalizePath = function normalizePath() {
  for (var _len = arguments.length, strings = Array(_len), _key2 = 0; _key2 < _len; _key2++) {
    strings[_key2] = arguments[_key2];
  }

  return _lodash2.default.flatten(strings.map(toPath)).filter(function (v) {
    return v;
  }).join('.');
};

// returns list of nodes, e.g: [['title', 'Lemur Town'], ['chapters', ['Chapter 1']]]
var traverse = exports.traverse = function traverse(qualifier, object, path) {
  var accumulator = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  if (!qualifier(object)) {
    return accumulator.concat([[normalizePath(path), object]]);
  }
  var results = _lodash2.default.toPairs(object).reduce(function (_accumulator, _ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var key = _ref2[0];
    var value = _ref2[1];
    return traverse(qualifier, value, normalizePath(path, key), _accumulator);
  }, []);
  return accumulator.concat(results);
};

// Returns an array of values and an array of paths where they were found
// Only one value will be returned unless the path contains "[]"
// Example: "teachers[].student[0]" will return the first student of every teacher
// ignores fragments enclosed by {} on returned paths &
// ignores paths enclosed by <> when getting values
var get = exports.get = function get() {
  var object = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
  var path = arguments[1];

  path = normalizePath(path);
  if (/\{.*\[].*}/.test(path) || /<.*\[].*>/.test(path)) {
    throw new Error('validate: do not enclose "[]" with <>\'s or {}\'s (' + path + ')');
  }
  path = [path.replace(/<.*>/, '').replace(/\{(.*)}/, '$1'), path.replace(/\{.*}/, '').replace(/<(.*)>/, '$1')];
  if (path[0] !== path[1]) return [get(object, path[0])[0], get(object, path[1])[1]];
  path = toPath(path[0]);
  if (!path.length || !path[0]) return [[object], ['']];else if (path[0] === '[]' && !_lodash2.default.isPlainObject(object) && !(object instanceof Array)) return [[], []];else if (object == undefined) return [[null], [path]]; // eslint-disable-line eqeqeq
  var keys = path[0] === '[]' ? Object.keys(object) : [path[0]];
  var results = keys.map(function (key) {
    return get(object[key], path.slice(1));
  });
  var values = _lodash2.default.flatten(_lodash2.default.map(results, '0'));
  var paths = _lodash2.default.flatten(results.map(function (_ref3, i) {
    var _ref4 = _slicedToArray(_ref3, 2);

    var _paths = _ref4[1];
    return _paths.map(function (_path) {
      return normalizePath(keys[i], _path);
    });
  }));
  return [values, paths];
};

// accepts a promise or an object containing a promise, returns a promise that resolves
// to a normal object and catches rejected strings / objects / SubmissionErrors
var normalizePromise = function normalizePromise(promise) {
  if (_lodash2.default.isPlainObject(promise)) {
    promise = _lodash2.default.mapValues(promise, normalizePromise);
    promise = _lodash2.default.toPairs(promise).map(function (_ref5) {
      var _ref6 = _slicedToArray(_ref5, 2);

      var k = _ref6[0];
      var p = _ref6[1];
      return p.then(function (result) {
        return [k, result];
      });
    });
    promise = Promise.all(promise).then(_lodash2.default.fromPairs).then(function (values) {
      return _lodash2.default.pickBy(values);
    });
  }
  return Promise.resolve(promise).catch(function (e) {
    if (typeof e === 'string' || _lodash2.default.isPlainObject(e) || e && e.constructor.name === 'SubmissionError') return e;
    throw e;
  }).then(function (e) {
    if (e && e.constructor.name === 'SubmissionError' && e.errors) return e.errors; // redux-form specific
    return e;
  });
};

var addPropTypeSupport = function addPropTypeSupport(f) {
  return function (v, k, values) {
    for (var _len2 = arguments.length, args = Array(_len2 > 3 ? _len2 - 3 : 0), _key3 = 3; _key3 < _len2; _key3++) {
      args[_key3 - 3] = arguments[_key3];
    }

    if (!/checkType$/.test(f.name)) return f.apply(undefined, [v, k, values].concat(args));
    values = _defineProperty({}, k, _lodash2.default.get(values, k));
    var error = f(values, k, 'redux-validate', 'prop');
    return _lodash2.default.get(error, 'message');
  };
};

var addIdentitySupport = function addIdentitySupport(f) {
  return typeof f === 'function' ? f : function (v) {
    return (v === '' || v == undefined) && f;
  };
}; // eslint-disable-line eqeqeq

var createChainableValidator = function createChainableValidator(createValidatorStep) {
  for (var _len3 = arguments.length, validators = Array(_len3 > 1 ? _len3 - 1 : 0), _key4 = 1; _key4 < _len3; _key4++) {
    validators[_key4 - 1] = arguments[_key4];
  }

  var validate = function validate() {
    for (var _len4 = arguments.length, args = Array(_len4), _key5 = 0; _key5 < _len4; _key5++) {
      args[_key5] = arguments[_key5];
    }

    // run validators
    var errors = validators.map(function (validator) {
      return validator.apply(undefined, args);
    });
    // errors (example) = [
    //   {title: 'Title is required'},
    //   {'author.name': Promise['resolve' | 'reject']('Author Name is required')},
    //   Promise['resolve' | 'reject']({content: 'Content is required'})]
    var isAsync = _lodash2.default.flatten(errors.map(function (error) {
      return error instanceof Promise ? error : _lodash2.default.values(error);
    })).some(function (error) {
      return error instanceof Promise;
    });
    if (isAsync) {
      errors = Promise.all(errors.map(normalizePromise));
    } else {
      (function () {
        var _errors = errors;
        errors = { then: function then(f) {
            return f(_errors);
          } };
      })();
    }
    // errors (example) = Promise.resolve([
    //   {title: 'Title is required'},
    //   {'author.name': 'Author Name is required'},
    //   {content: 'Content is required'}])
    return errors.then(function (_errors) {
      // order errors so low-index validators have precedence over high-index validators
      // and deep keys have precedence over shallow keys
      var keys = Object.keys(_errors.reduce(function (pv, v) {
        return Object.assign(pv, v);
      }, {}));
      _errors = keys.map(function (key) {
        var index = _lodash2.default.map(_errors, key).findIndex(function (v) {
          return v;
        });
        if (index == undefined) return null; // eslint-disable-line eqeqeq
        return { index: index, key: key, value: _errors[index][key] };
      }).filter(function (v) {
        return v;
      });
      _errors = _lodash2.default.orderBy(_errors, ['index', function (_ref7) {
        var value = _ref7.value;
        return value.split('.').length;
      }], ['desc', 'asc']);
      // _errors (example) = [
      //   {key: 'title', value: 'Title is required'},
      //   {key: 'author.name', value: 'Author Name is required'},
      //   {key: 'content', value: 'Content is required'}]
      _errors = _errors.reduce(function (result, _ref8) {
        var key = _ref8.key;
        var value = _ref8.value;
        return _lodash2.default.set(result, key, value);
      }, {});
      // _errors (example) = {
      //   title: 'Title is required',
      //   author: {name: 'Author Name is required'},
      //   content: 'Content is required'}
      if (Object.keys(_errors).length && errors instanceof Promise) return Promise.reject(_errors);
      return _errors;
    });
  };
  validate.then = function (_validator, _df) {
    return createValidatorStep(_validator, _df, validators);
  };
  return validate;
};

var createValidate = exports.createValidate = function createValidate(df) {
  var createValidatorStep = function createValidatorStep(validator) {
    var _df = arguments.length <= 1 || arguments[1] === undefined ? df : arguments[1];

    var accumulator = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

    _df = addIdentitySupport(_df);
    // convert (function / null / string / array[strings] / object[functions / strings]) into
    // function that returns promise.resolve(object) or object with:
    // * keys expanded, e.g: {'children[]': validator} becomes {'children.0': error, 'children.1': error}
    // * React PropType support
    // * non-errors ommitted from keys, i.e: {} if no errors
    // * some object values may be promises
    var validationStep = function validationStep(values) {
      for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key6 = 1; _key6 < _len5; _key6++) {
        args[_key6 - 1] = arguments[_key6];
      }

      var _validator = validator;
      if (typeof _validator === 'function') {
        var result = _validator.apply(undefined, [values].concat(args));
        var normalizeResult = function normalizeResult(errors) {
          return _lodash2.default.pickBy(_lodash2.default.mapKeys(errors, function (v, k) {
            return normalizePath(k);
          }));
        };
        if (result instanceof Promise) return normalizePromise(result).then(normalizeResult);
        return normalizeResult(result);
      }
      if (typeof _validator === 'string') _validator = [_validator];
      if (!_validator) {
        // if no validator is specified traverse values and validate every leaf node against default function
        _validator = traverse(function (v) {
          return _lodash2.default.isPlainObject(v) || v instanceof Array;
        }, values);
        _validator = _validator.map(function (_ref9) {
          var _ref10 = _slicedToArray(_ref9, 1);

          var path = _ref10[0];
          return [path, _df];
        });
      } else if (_validator instanceof Array) _validator = _validator.map(function (key) {
        return [key, _df];
      });else _validator = _lodash2.default.toPairs(_validator);

      // Add support for nested object / array validators
      _validator = _validator.reduce(function (__validator, _ref11) {
        var _ref12 = _slicedToArray(_ref11, 2);

        var path = _ref12[0];
        var func = _ref12[1];

        if (!_lodash2.default.isPlainObject(func)) return __validator.concat([[path, func]]);
        var results = traverse(_lodash2.default.isPlainObject, func, path);
        return __validator.concat(results);
      }, []);
      _validator = _validator.reduce(function (__validator, _ref13) {
        var _ref14 = _slicedToArray(_ref13, 2);

        var path = _ref14[0];
        var func = _ref14[1];

        if (!(func instanceof Array)) return __validator.concat([[path, func]]);
        return __validator.concat(func.map(function (key) {
          return [normalizePath(path, key), _df];
        }));
      }, []);

      // Enhances functions (identity + PropType support), expands complex paths (e.g: {doctors.}[].name)
      _validator = _lodash2.default.flatten(_validator.map(function (_ref15) {
        var _ref16 = _slicedToArray(_ref15, 2);

        var key = _ref16[0];
        var func = _ref16[1];

        func = addPropTypeSupport(addIdentitySupport(func));
        var results = _lodash2.default.zip.apply(_lodash2.default, _toConsumableArray(get(values, key)));
        return results.map(function (_ref17) {
          var _ref18 = _slicedToArray(_ref17, 2);

          var value = _ref18[0];
          var _key = _ref18[1];
          return { value: value, key: _key, func: func };
        });
      }));
      // Call all the validators
      var results = _validator.map(function (_ref19) {
        var value = _ref19.value;
        var key = _ref19.key;
        var func = _ref19.func;
        return [key, func.apply(undefined, [value, key, values].concat(args))];
      });
      // Add support for validators that return objects
      results = results.reduce(function (_results, _ref20) {
        var _ref21 = _slicedToArray(_ref20, 2);

        var path = _ref21[0];
        var value = _ref21[1];

        if (_lodash2.default.isPlainObject(value)) {
          var __results = _lodash2.default.toPairs(value).map(function (_ref22) {
            var _ref23 = _slicedToArray(_ref22, 2);

            var _key = _ref23[0];
            var _value = _ref23[1];
            return [normalizePath(path, _key), _value];
          });
          // prevent object values overwriting keyed values
          __results = __results.filter(function (_ref24) {
            var _ref25 = _slicedToArray(_ref24, 1);

            var key = _ref25[0];
            return !results.some(function (_ref26) {
              var _ref27 = _slicedToArray(_ref26, 1);

              var _key = _ref27[0];
              return _key === key;
            });
          });
          return _results.concat(__results);
        }
        return _results.concat([[path, value]]);
      }, []);
      return _lodash2.default.pickBy(_lodash2.default.fromPairs(results));
    };
    accumulator = accumulator.concat(validationStep);
    return createChainableValidator.apply(undefined, [createValidatorStep].concat(_toConsumableArray(accumulator)));
  };
  var validate = function validate(validator, _df) {
    return createValidatorStep(validator, _df);
  };
  return validate;
};

var defaultValidate = exports.defaultValidate = function defaultValidate(v, k) {
  return (v === '' || v == undefined) && _lodash2.default.startCase(k) + ' is required';
}; // eslint-disable-line
var validate = exports.validate = createValidate(defaultValidate);
exports.default = validate;