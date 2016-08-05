import _ from 'lodash'

// Converts:
// 'alpha.[5].child[marvelous].sausage'
// and:
// ['giant.flamingo', ['alpha', 'will', [['beta[6]']]], 'croissant']
// into something like:
// ['giant', 'flamingo', 'alpha', 'will', 'beta', '6', 'croissant']
export const toPath = str => {
  if (str instanceof Array) return str.length <= 1 ? toPath(str[0]) : _.flatten(str.map(toPath))
  if (str == undefined) return [] // eslint-disable-line eqeqeq
  str = str.toString()
  const bracketedParts = (str.match(/\[\w*\]/g) || ['']).map(s => s === '[]' ? s : s.slice(1, -1))
  let path = _.flatten(_.zip(str.split(/\[\w*\]/), bracketedParts)).filter(part => !!part)
  path = _.flatten(path.map(part => part.split('.'))).filter(part => !!part)
  return path
}

// 'Accepts[ugly]', ['paths.and', 'outputs'] 'normal.paths.like.this'
const normalizePath = (...strings) =>
  _.flatten(strings.map(toPath)).filter(v => v).join('.')

// returns list of nodes, e.g: [['title', 'Lemur Town'], ['chapters', ['Chapter 1']]]
export const traverse = (qualifier, object, path, accumulator = []) => {
  if (!qualifier(object)) {
    return accumulator.concat([[normalizePath(path), object]])
  }
  const results = _.toPairs(object).reduce(
    (_accumulator, [key, value]) =>
      traverse(qualifier, value, normalizePath(path, key), _accumulator), [])
  return accumulator.concat(results)
}

// Returns an array of values and an array of paths where they were found
// Only one value will be returned unless the path contains "[]"
// Example: "teachers[].student[0]" will return the first student of every teacher
// ignores fragments enclosed by {} on returned paths &
// ignores paths enclosed by <> when getting values
export const get = (object = null, path) => {
  path = normalizePath(path)
  if (/\{.*\[].*}/.test(path) || /<.*\[].*>/.test(path)) {
    throw new Error(`validate: do not enclose "[]" with <>'s or {}'s (${path})`)
  }
  path = [
    path.replace(/<.*>/, '').replace(/\{(.*)}/, '$1'),
    path.replace(/\{.*}/, '').replace(/<(.*)>/, '$1')]
  if (path[0] !== path[1]) return [get(object, path[0])[0], get(object, path[1])[1]]
  path = toPath(path[0])
  if (!path.length || !path[0]) return [[object], ['']]
  else if (path[0] === '[]' && !_.isPlainObject(object) && !(object instanceof Array)) return [[], []]
  else if (object == undefined) return [[null], [path]] // eslint-disable-line eqeqeq
  const keys = path[0] === '[]' ? Object.keys(object) : [path[0]]
  const results = keys.map(key => get(object[key], path.slice(1)))
  const values = _.flatten(_.map(results, '0'))
  const paths = _.flatten(results.map(([, _paths], i) => _paths.map(_path => normalizePath(keys[i], _path))))
  return [values, paths]
}

// accepts a promise or an object containing a promise, returns a promise that resolves
// to a normal object and catches rejected strings / objects / SubmissionErrors
const normalizePromise = (promise) => {
  if (_.isPlainObject(promise)) {
    promise = _.mapValues(promise, normalizePromise)
    promise = _.toPairs(promise).map(([k, p]) => p.then(result => [k, result]))
    promise = Promise.all(promise).then(_.fromPairs).then(values => _.pickBy(values))
  }
  return Promise.resolve(promise).catch(e => {
    if (typeof e === 'string' || _.isPlainObject(e) || (e && e.constructor.name === 'SubmissionError')) return e
    throw e
  }).then(e => {
    if (e && e.constructor.name === 'SubmissionError' && e.errors) return e.errors // redux-form specific
    return e
  })
}

const addPropTypeSupport = f => (v, k, values, ...args) => {
  if (!/checkType$/.test(f.name)) return f(v, k, values, ...args)
  values = {[k]: _.get(values, k)}
  const error = f(values, k, 'redux-validate', 'prop')
  return _.get(error, 'message')
}

const addIdentitySupport = f =>
  typeof f === 'function' ? f : (v => (v === '' || v == undefined) && f) // eslint-disable-line eqeqeq

const createChainableValidator = (createValidatorStep, ...validators) => {
  const validate = (...args) => {
    // run validators
    let errors = validators.map(validator => validator(...args))
    // errors (example) = [
    //   {title: 'Title is required'},
    //   {'author.name': Promise['resolve' | 'reject']('Author Name is required')},
    //   Promise['resolve' | 'reject']({content: 'Content is required'})]
    const isAsync = _.flatten(errors.map(error => error instanceof Promise ? error : _.values(error)))
      .some(error => error instanceof Promise)
    if (isAsync) {
      errors = Promise.all(errors.map(normalizePromise))
    } else {
      const _errors = errors
      errors = {then: f => f(_errors)}
    }
    // errors (example) = Promise.resolve([
    //   {title: 'Title is required'},
    //   {'author.name': 'Author Name is required'},
    //   {content: 'Content is required'}])
    return errors.then(_errors => {
      // order errors so low-index validators have precedence over high-index validators
      // and deep keys have precedence over shallow keys
      const keys = Object.keys(_errors.reduce((pv, v) => Object.assign(pv, v), {}))
      _errors = keys.map(key => {
        const index = _.map(_errors, key).findIndex(v => v)
        if (index == undefined) return null // eslint-disable-line eqeqeq
        return {index, key, value: _errors[index][key]}
      }).filter(v => v)
      _errors = _.orderBy(_errors, ['index', ({value}) => value.split('.').length], ['desc', 'asc'])
      // _errors (example) = [
      //   {key: 'title', value: 'Title is required'},
      //   {key: 'author.name', value: 'Author Name is required'},
      //   {key: 'content', value: 'Content is required'}]
      _errors = _errors.reduce((result, {key, value}) => _.set(result, key, value), {})
      // _errors (example) = {
      //   title: 'Title is required',
      //   author: {name: 'Author Name is required'},
      //   content: 'Content is required'}
      if (Object.keys(_errors).length && errors instanceof Promise) return Promise.reject(_errors)
      return _errors
    })
  }
  validate.then = (_validator, _df) => createValidatorStep(_validator, _df, validators)
  return validate
}

export const createValidate = df => {
  const createValidatorStep = (validator, _df = df, accumulator = []) => {
    _df = addIdentitySupport(_df)
    // convert (function / null / string / array[strings] / object[functions / strings]) into
    // function that returns promise.resolve(object) or object with:
    // * keys expanded, e.g: {'children[]': validator} becomes {'children.0': error, 'children.1': error}
    // * React PropType support
    // * non-errors ommitted from keys, i.e: {} if no errors
    // * some object values may be promises
    const validationStep = (values, ...args) => {
      let _validator = validator
      if (typeof _validator === 'function') {
        const result = _validator(values, ...args)
        const normalizeResult = errors => _.pickBy(_.mapKeys(errors, (v, k) => normalizePath(k)))
        if (result instanceof Promise) return normalizePromise(result).then(normalizeResult)
        return normalizeResult(result)
      }
      if (typeof _validator === 'string') _validator = [_validator]
      if (!_validator) {
        // if no validator is specified traverse values and validate every leaf node against default function
        _validator = traverse(v => _.isPlainObject(v) || v instanceof Array, values)
        _validator = _validator.map(([path]) => [path, _df])
      } else if (_validator instanceof Array) _validator = _validator.map(key => [key, _df])
      else _validator = _.toPairs(_validator)

      // Add support for nested object / array validators
      _validator = _validator.reduce((__validator, [path, func]) => {
        if (!_.isPlainObject(func)) return __validator.concat([[path, func]])
        const results = traverse(_.isPlainObject, func, path)
        return __validator.concat(results)
      }, [])
      _validator = _validator.reduce((__validator, [path, func]) => {
        if (!(func instanceof Array)) return __validator.concat([[path, func]])
        return __validator.concat(func.map(key => [normalizePath(path, key), _df]))
      }, [])

      // Enhances functions (identity + PropType support), expands complex paths (e.g: {doctors.}[].name)
      _validator = _.flatten(
        _validator.map(([key, func]) => {
          func = addPropTypeSupport(addIdentitySupport(func))
          const results = _.zip(...get(values, key))
          return results.map(([value, _key]) => ({value, key: _key, func}))
        }))
      // Call all the validators
      let results = _validator.map(({value, key, func}) =>
        [key, func(value, key, values, ...args)]
      )
      // Add support for validators that return objects
      results = results.reduce((_results, [path, value]) => {
        if (_.isPlainObject(value)) {
          let __results = _.toPairs(value).map(([_key, _value]) => [normalizePath(path, _key), _value])
          // prevent object values overwriting keyed values
          __results = __results.filter(([key]) => !results.some(([_key]) => _key === key))
          return _results.concat(__results)
        }
        return _results.concat([[path, value]])
      }, [])
      return _.pickBy(
        _.fromPairs(results))
    }
    accumulator = accumulator.concat(validationStep)
    return createChainableValidator(createValidatorStep, ...accumulator)
  }
  const validate = (validator, _df) => createValidatorStep(validator, _df)
  return validate
}

export const defaultValidate = (v, k) => (v === '' || v == undefined) && `${_.startCase(k)} is required` // eslint-disable-line
export const validate = createValidate(defaultValidate)
export default validate
