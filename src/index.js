import _ from 'lodash';

const thenable = (blueprint, stack = []) => (...raw) => {
  const inner = (...argsRaw) => _.thru(
    argsRaw.length <= 1 ? [argsRaw, {}] : [argsRaw.slice(0, -1), _.last(argsRaw)],
    ([args, current]) => stack.concat(blueprint(...raw)).reduce(
      (c, f, i) => _.defaults(f(...args, c), i && c), current
    )
  );
  inner.then = thenable(blueprint, stack.concat(blueprint(...raw)));
  return inner;
};

export const createValidate = df => {
  const testAll = (lo, f, args) => (
    lo.mapValues((v, k) => (
      (f || df)(v, k, ...args)
    )).pick(_.identity).value()
  );

  return thenable((reqs, func) => (values, ...args) => (
    typeof reqs === 'function' ?
      reqs(values, ...args) :
    !reqs ?
      testAll(_.chain(values), func, [values, ...args]) :
    reqs instanceof Array ?
      testAll(_.chain(values).pick(reqs), func, [values, ...args]) :
    _.isPlainObject(values) ? (
        _.chain(values).pick(_.keys(reqs))
          .mapValues((v, k) => [v, typeof reqs[k] === 'function' ? reqs[k] : () => reqs[k]])
          .mapValues(([v, f], k) => f(v, k, values, ...args)).value()) : {}
  ));
};

export default createValidate((v, k) => !v && `${_.startCase(k)} is required`);
