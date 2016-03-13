# redux-validate

Easy validation for [redux-form](https://github.com/erikras/redux-form)

`npm i redux-validate`

## Quick Start

```js
import validate from 'redux-validate';

reduxForm({
  ...
  validate: validate(['title', 'description']) // {title: 'Blah', description: ''} =>
})(Component)                                  // {description: 'Description is required'}
```

## Examples

```js
validate() // {title: ''} => {title: 'Title is required'}

validate(['title']) // {title: ''} => {title: 'Title is required'}

validate({title: 'Subject needed'}) // {title: ''} => {title: 'Subject needed'}
```

For using functions
```
f :: (value, key, ...remainingArgs)
Sync: remainingArgs :: allValues, props
Async: remainingArgs :: allValues, dispatch, props
```

```js
validate({password: p => p.length <= 5 && 'Password must be longer than 6 charachters'})
// {password: 'correcthorsebatterystaple'} => {}

validate(({frostBolt, fireBolt}) => frostBolt && fireBolt && ({magic: 'You can only pick one'}))
// {frostBolt: true, fireBolt: true} => {magic: 'You can only pick one'}
```
Validation is chainable, first error encountered has precedent
```js
validate(['title']).then({subject: 'Content missing'})
// {title: 'Red Book', subject: ''} => {subject: 'Content missing'}
```

The default function can be replaced totally or case-by-case

```js
import {createValidate} from 'redux-validate';
const validate = createValidate((v, k) => !v && `You forgot ${_.startCase(k)}`);

validate() // {title: ''} => {title: 'You forgot Title'}

validate(null, (v, k) => !v && `You forgot ${_.startCase(v)}`)
// {title: ''} => {title: 'You forgot Title'}
```

React PropTypes
```js
import validate, {createValidate} from 'redux-validate';
const stringValidator = createValidate(PropTypes.string.isRequired);

stringValidator(['title'])
// {title: 5}) => {title: 'Invalid undefined `title` of type `number` supplied to `<<anonymous>>`, expected `string`.'}

validate({gender: PropTypes.oneOf(['Male', 'Female'])})
// {gender: 'Transgender'} =>
// {gender: 'Invalid undefined `gender` of value `Transgender` supplied to `<<anonymous>>`, expected one of ["Male","Female"].'})
```

## Todo

* Promises
* Deep Fields

## License

ISC
