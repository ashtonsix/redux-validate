# redux-validate

Easy validation optimized for [redux-form](https://github.com/erikras/redux-form). Also suitable for props/state validation/testing.

`npm i redux-validate`

## Quick Start

```js
import validate from 'redux-validate';

reduxForm({
  ...
  validate: validate(['title', 'description']) // {title: 'Code Geass', description: ''} =>
})(Component)                                  // {description: 'Description is required'}
```

## Complete Guide

There are many ways to use redux-validate, demonstrated below by example.

You can look at the tests for more examples.

```js
import validate, {createValidate} from 'redux-validate';

/*
createValidate :: (defaultFunction) => validate
validate :: (validator, defaultFunctionOverride) => (values, ...args) => errors

If validator is a function it will receive (values, ...args), in every other
case validators will be specific to one key and receive:
  (value, key, values, ...args)

If using redux-plus:
  "...args" = (props) for sync validation
  "...args" = (dispatch, props) for async validation

If validator is synchronous, then errors is a plain object.
If validator is asynchronous, then errors is either:
  "Promise.resolve({})" or "Promise.reject(object)"
*/

const json = {
  name: 'Ashford Academy',
  headmaster: '',
  location: '',
  teachers: [
    {name: '', students: {
      Lelouch: {name: '', class: ''},
      Suzaku: {name: '', class: 'Red'}}},
    {name: 'Villetta Nu', students: [
      {name: '', class: ''}]},
    {name: '', students: []}
  ]
}

let errors
let customValidate

// array of strings
errors = validate(['name', 'headmaster', 'location'])(json) =
{headmaster: 'Headmaster is required', location: 'Location is required'}

// one string
errors = validate('location')(json) =
{location: 'Location is required'}

// function
errors = validate(({teachers}) => {
  if (teachers.find(({name}) => !name)) {
    return {teachers: 'Every teacher must have a name'}
  }
})(json) =
{teachers: 'Every teacher must have a name'}

// object<string>
errors = validate({location: 'Location is needed'})(json) =
{location: 'Location is needed'}

// object<function>
errors = validate({
  name: name => / /.test(name) &&
    'Name must not contain spaces'})(json) =
{name: 'Name must not contain spaces'}

// overriding default validator (string)
errors = validate('headmaster', 'Required')(json) =
{headmaster: 'Required'}

// overriding default validator (function)
errors = validate(
  ['headmaster', 'location'],
  (value, key) => !value && `You forgot ${_.startCase(key)}`
)(json) =
{headmaster: 'You forgot Headmaster', location: 'You forgot Location'}

// creating new validate function
customValidate = createValidate('Required')
errors = customValidate('headmaster')(json) =
{headmaster: 'Required'}

// deep keys
errors = validate('teachers[1].students[0].name')(json) =
{teachers: {1: {students: {0: {name: 'Teachers 1 Students 0 Name is required'}}}}}

// iteration (array)
errors = validate('teachers[]', ({name}) => !name && 'Name is required')(json) =
{teachers: {0: 'Name is required', 2: 'Name is required'}}

// iteration (object)
errors = validate('teachers[0].students[]', ({class}) => !class && 'Class is required')(json) =
{teachers: {0: {students: {Lelouch: 'Class is required'}}}}

// iteration (nested)
errors = validate('teachers[].students[].name', 'Required')(json) =
{teachers: {
  0: {students: {Lelouch: {name: 'Required'}, Suzaku: {name: 'Required'}}},
  1: {students: {0: {name: 'Required'}}}}}

/*
When chaining the first error encountered (on left) takes precedence if multiple
errors exist for one path, every validator is always executed regardless of whether
an error was already encountered, this is true for sync & async validators
*/

// chaining
errors = validate('name', 'Name required').then('location', 'Location required')(json) =
{name: 'Name required', location: 'Location required'}

// nesting validators (array)
errors = validate({teachers: ['0.name', '1.name']}, 'Required')(json) =
{teachers: {0: {name: 'Required'}}}

// nesting validators (object)
errors = validate({teachers: {'0.students': {Suzaku: '[]', Lelouch: '[]'}}}, 'Required')(json) =
{teachers: {0: {students: {Lelouch: {name: 'Required', class: 'Required'}, Suzaku: {name: 'Required'}}}}}

// nesting validators (validators)
errors = validate({'teachers.0': validate('name').then('students.Suzaku.name')})(json) =
{teachers: {0: {name: 'Name is required', {students: {Suzaku: {name: 'Students Suzaku Name is required'}}}}}}

// returning objects
errors = validate(
  'teachers.2',
  ({name, students}) => ({
    name: !name && 'Required',
    students: !students.length && 'Required'
  })
)(json) =
{teachers: {2: {name: 'Required', students: 'Required'}}}

// manipulating keys (additive)
errors = validate(
  'teachers[].students<._error>',
  students => !Object.keys(students).length && 'At least one student required'
)(json) =
{teachers: {2: {students: {_error: 'At least one student required'}}}}

// manipulating keys (subtractive)
errors = validate(
  'teachers[]{.students}',
  students => !Object.keys(students).length && 'At least one student required'
)(json) =
{teachers: {2: 'At least one student required'}}

// top-level keys
errors = validate('[]')(json) =
{headmaster: 'Headmaster is required', location: 'Location is required'}

// recursive validation
errors = validate(null, 'Required')(json) =
{
  headmaster: 'Required',
  location: 'Required',
  teachers: [
    {name: 'Required', students: {
      Lelouch: {name: 'Required', class: 'Required'},
      Suzaku: {name: 'Required'}}},
    {students: {
      0: {name: 'Required', class: 'Required'}}},
    {name: 'Required'}
  ]
}

/*
If a validator mixes sync & async functions (via "then" or different keys)
the result will be an async validator
*/

// async (function)
errors = validate(({name}) => Promise.reject({name: `Name must be unique, ${name} already exists`}))(json) =
Promise.reject({name: 'Name must be unique, Ashford Academy already exists'})

// async (object)
errors = validate({name: name => Promise.reject(`Name must be unique, ${name} already exists`)})(json) =
Promise.reject({name: 'Name must be unique, Ashford Academy already exists'})

// propTypes
import {PropTypes} from 'react'
errors = validate('teachers[]', PropTypes.shape({
  name: PropTypes.string,
  students: PropTypes.array}))(json) =
{teachers: {0: 'Invalid prop `teachers.0.students` of type `object` supplied to `redux-validate`, expected `array`.'}}
```

## License

ISC
