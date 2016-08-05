/* eslint func-names:0, prefer-arrow-callback:0, no-sparse-arrays:0 */

import expect from 'expect'
import {startCase} from 'lodash'
import {PropTypes} from 'react'
const {default: validate, createValidate} = require(`../${process.env.DIRECTORY || ''}index`)

describe('base functionality', function() {
  it('should validate top-level values if no parameters are passed', function() {
    expect(validate()(
      {title: ''})).toEqual(
      {title: 'Title is required'})
    expect(validate()(
      {title: 'My title'})).toEqual(
      {})
  })
  it('should validate nested values if no parameters are passed', function() {
    expect(validate()(
      {book: {title: '', chapters: ['Chapter 0', '']}})).toEqual(
      {book: {title: 'Book Title is required', chapters: [, 'Book Chapters 1 is required']}})
  })
  it('should validate keys described by arrays', function() {
    const validator = validate(['title', 'content'])
    expect(validator(
      {title: '', content: '', author: ''})).toEqual(
      {title: 'Title is required', content: 'Content is required'})
    expect(validator(
      {title: '', content: 'Once upon a time..', author: ''})).toEqual(
      {title: 'Title is required'})
    expect(validator(
      {title: 'Fairy Tale', content: 'Once upon a time..', author: ''})).toEqual(
      {})
  })
  it('should use identity for non-function validators', function() {
    const validator = validate({title: 'Subject needed'})
    expect(validator(
      {title: ''})).toEqual(
      {title: 'Subject needed'})
    expect(validator(
      {title: "There's a subject, don't worry"})).toEqual(
      {})
  })
  it('should match values to validation keys', function() {
    const validator = validate({password: p => p.length <= 6 && 'Password must be longer than 6 charachters'})
    expect(validator(
      {password: 'correcthorsebatterystaple'})).toEqual(
      {})
    expect(validator(
      {password: '111'})).toEqual(
      {password: 'Password must be longer than 6 charachters'})
  })
  it('should validate vanilla-style if a function is provided', function() {
    const validator = validate(v => v.frostBolt && v.fireBolt && ({magic: 'You can only pick one'}))
    expect(validator(
      {frostBolt: true, fireBolt: true})).toEqual(
      {magic: 'You can only pick one'})
    expect(validator(
      {frostBolt: true, fireBolt: false})).toEqual(
      {})
  })
  it('should override the default validation', function() {
    expect(
      validate(null, (v, k) => !v && `You forgot ${startCase(k)}`)(
      {title: ''})).toEqual(
      {title: 'You forgot Title'})
    expect(
      validate('content', (v, k) => !v && `You forgot ${startCase(k)}`)(
      {title: '', content: ''})).toEqual(
      {content: 'You forgot Content'})
    expect(
      validate('content', 'Required')(
      {title: '', content: ''})).toEqual(
      {content: 'Required'})
  })
  it('should be possible to return objects from keyed validators', function() {
    const validator = validate({
      title: 'Required',
      author: ({name, booksWritten}) => ({
        name: !name && 'Required',
        booksWritten: !booksWritten && 'Required'})})
    expect(validator(
      {title: '', author: {name: '', booksWritten: ''}})).toEqual(
      {title: 'Required', author: {name: 'Required', booksWritten: 'Required'}})
    expect(validator(
      {title: '', author: {name: 'Emi', booksWritten: ''}})).toEqual(
      {title: 'Required', author: {booksWritten: 'Required'}})
  })
})

describe('deep keys', function() {
  it('should validate deep keys', function() {
    expect(validate('author.name')(
      {title: '', author: {name: '', booksWritten: ''}})).toEqual(
      {author: {name: 'Author Name is required'}})
  })
  it('should validate very deep keys', function() {
    expect(validate('alpha.beta.gamma.theta.meta')(
      {alpha: {beta: {gamma: {theta: {meta: '', douche: ''}}}}})).toEqual(
      {alpha: {beta: {gamma: {theta: {meta: 'Alpha Beta Gamma Theta Meta is required'}}}}})
  })
  it('should iterate through values when "[]" is used', function() {
    expect(validate('people[].name')(
      {people: [{name: 'John'}, {name: ''}, {name: 'Suzaku'}]})).toEqual(
      {people: [, {name: 'People 1 Name is required'}]})
  })
  it('should flatten errors when "[]" is used multiple times', function() {
    expect(validate('teachers[].students[]')(
      {teachers: [{students: ['', 'John']}, {students: ['Suzaku', '', 'Ophelia']}]})).toEqual(
      {teachers: [
        {students: ['Teachers 0 Students 0 is required']},
        {students: [, 'Teachers 1 Students 1 is required']}]})
  })
  it('should give deep keys precedence over shallow keys', function() {
    let validator = validate({
      student: ({year}) => !year && ({year: 'year is required', name: 'poop'}),
      'student.name': name => !name && 'name is required'})
    expect(validator(
      {student: {name: '', class: ''}})).toEqual(
      {student: {name: 'name is required', year: 'year is required'}})
    // flipped ordering ensures deep key isn't getting precedence by chance
    validator = validate({
      'student.name': name => !name && 'name is required',
      student: ({year}) => !year && ({year: 'year is required', name: 'poop'})})
    expect(validator(
      {student: {name: '', class: ''}})).toEqual(
      {student: {name: 'name is required', year: 'year is required'}})
  })
})

describe('nesting validators', function() {
  it('should work with nested validator', function() {
    expect(validate({author: validate(['name'])})(
      {author: {name: ''}})).toEqual(
      {author: {name: 'Name is required'}})
  })
  it('should work with nested array', function() {
    expect(validate({author: ['name']})(
      {author: {name: ''}})).toEqual(
      {author: {name: 'Author Name is required'}})
  })
  it('should work with nested object', function() {
    expect(validate({author: {name: 'Required'}})(
      {author: {name: ''}})).toEqual(
      {author: {name: 'Required'}})
  })
  it('should work with deeply nested object', function() {
    expect(validate({alpha: {beta: {theta: {parrot: 'Required'}}}})(
      {alpha: {beta: {theta: {parrot: ''}}}})).toEqual(
      {alpha: {beta: {theta: {parrot: 'Required'}}}})
  })
})

describe('key manipulation', function() {
  it('should ignore paths enclosed by <> when getting values', function() {
    expect(validate('students<._error>', v => !v.length && 'At least one student is required')(
      {students: []})).toEqual(
      {students: {_error: 'At least one student is required'}})
  })
  it('should ignore paths enclosed by {} when setting errors', function() {
    expect(validate('student{.name}', v => !v && 'Student name is required')(
      {student: {name: ''}})).toEqual(
      {student: 'Student name is required'})
  })
})

describe('null values', function() {
  it('should treat non-existent values as null', function() {
    expect(validate('author')(
      {})).toEqual(
      {author: 'Author is required'})
  })
  it('should treat deep non-existent values as null', function() {
    expect(validate('author.name')(
      {})).toEqual(
      {author: {name: 'Author Name is required'}})
  })
  it("shouldn't return errors when iterating over a non-existent array", function() {
    expect(validate('teachers[].students[]')(
      {})).toEqual(
      {})
  })
})

describe('async', function() {
  const asyncTest = (validator, done) => {
    const catches = [false, false]
    Promise.all([
      validator({title: '', content: '', author: ''}).catch(errors => {
        catches[0] = true
        expect(errors).toEqual({title: 'Title is required', content: 'Content is required'})
      }).then(() => expect(catches[0]).toBe(true)),
      validator({title: '', content: 'Once upon a time..', author: ''}).catch(errors => {
        catches[1] = true
        expect(errors).toEqual({title: 'Title is required'})
      }).then(() => expect(catches[1]).toBe(true)),
      validator({title: 'Fairy Tale', content: 'Once upon a time..', author: ''}).then(errors => {
        expect(errors).toEqual({})
      })])
      .catch((error) => { done(error); throw error })
      .then(() => done())
  }
  it('should be possible to use an async function', function(done) {
    const validator = validate(({title, content}) => {
      const titleError = !title && 'Title is required'
      const contentError = !content && 'Content is required'
      return Promise.resolve({title: titleError, content: contentError})
    })
    asyncTest(validator, done)
  })
  it('should combine promises on keys', function(done) {
    const validator = validate(['title', 'content'], (v, k) => Promise.resolve(!v && `${startCase(k)} is required`))
    asyncTest(validator, done)
  })
  it('should combine a mix of promises and non-promises', function(done) {
    const validator = validate({
      title: title => Promise.resolve(!title && 'Title is required'),
      content: content => !content && 'Content is required'})
    asyncTest(validator, done)
  })
  it('should be possible to chain a mix of promises and non-promises', function(done) {
    const validator = validate(
      'title', title => Promise.resolve(!title && 'Title is required')).then(
      'content', content => !content && 'Content is required')
    asyncTest(validator, done)
  })
})

describe('chaining', function() {
  it('should be possible to chain validators', function() {
    expect(
      validate('title').then({subject: 'Content missing'})(
      {title: 'Red Book', subject: ''})).toEqual(
      {subject: 'Content missing'})
  })
  it('should give precedence to low-index validators', function() {
    const validator =
      validate({password: p => p.length <= 6 && 'Password must be longer than 6 charachters'})
        .then({password: p => (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) &&
          'Password must contain both uppercase and lowercase charachters'})
    expect(validator(
      {password: 'blah'})).toEqual(
      {password: 'Password must be longer than 6 charachters'})
    expect(validator(
      {password: 'blahblah'})).toEqual(
      {password: 'Password must contain both uppercase and lowercase charachters'})
    expect(validator(
      {password: 'BlahBlah'})).toEqual(
      {})
  })
})

describe('createValidate', function() {
  it('should set the default validator when a function is provided', function() {
    const newValidate = createValidate((v, k) => !v && `You forgot ${startCase(k)}`)
    expect(
      newValidate()(
      {title: ''})).toEqual(
      {title: 'You forgot Title'})
  })
})

describe('React PropTypes', function() {
  it('should work with keyed validators', function() {
    expect(
      validate({gender: PropTypes.oneOf(['Male', 'Female'])})(
      {gender: 'Transgender'})).toEqual(
      {gender: 'Invalid prop `gender` of value `Transgender` supplied to `redux-validate`, expected one of ["Male","Female"].'})
  })
  it('should work with deep keys', function() {
    expect(
      validate({'author.gender': PropTypes.oneOf(['Male', 'Female'])})(
      {author: {gender: 'Transgender'}})).toEqual(
      {author: {gender:
        'Invalid prop `author.gender` of value `Transgender` supplied to `redux-validate`, expected one of ["Male","Female"].'}})
  })
  it('should work with default functions', function() {
    const newValidate = createValidate(PropTypes.string.isRequired)
    expect(
      newValidate('title')(
      {title: 5})).toEqual(
      {title: 'Invalid prop `title` of type `number` supplied to `redux-validate`, expected `string`.'})
  })
})
