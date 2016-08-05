/* eslint func-names:0, prefer-arrow-callback:0 */

import expect from 'expect'
import _ from 'lodash'
const {get, toPath, traverse, defaultValidate} = require(`../${process.env.NODE_ENV === 'production' ? '' : 'src/'}index`)

describe('toPath', function() {
  it('should split an ordinary path', function() {
    expect(toPath('alpha.beta')).toEqual(['alpha', 'beta'])
  })
  it('should split a long path', function() {
    expect(toPath('alpha.5.child.marvelous.sausage')).toEqual(['alpha', '5', 'child', 'marvelous', 'sausage'])
  })
  it('should treat square brackets as property accessors', function() {
    expect(toPath('alpha.[5].child[marvelous].sausage')).toEqual(['alpha', '5', 'child', 'marvelous', 'sausage'])
  })
  it("shouldn't mutate empty square brackets", function() {
    expect(toPath('alpha.[].child[].sausage')).toEqual(['alpha', '[]', 'child', '[]', 'sausage'])
  })
  it('should flatten arrays of paths', function() {
    expect(
      toPath(['giant.flamingo', ['alpha', 'will', [['beta[6]']]], 'croissant']))
      .toEqual(['giant', 'flamingo', 'alpha', 'will', 'beta', '6', 'croissant'])
  })
})

describe('get', function() {
  it('should get top-level keys', function() {
    expect(get({name: 'John'}, 'name')).toEqual([['John'], ['name']])
  })
  it('should return null if value does not exist', function() {
    expect(get({name: 'John'}, 'age')).toEqual([[null], ['age']])
  })
  it('should get deep keys (and normalize paths)', function() {
    expect(
      get(
        {people: [{name: 'John'}]},
        'people[0].name')).toEqual(
      [['John'], ['people.0.name']])
  })
  it('should ignore paths enclosed by <> when getting values', function() {
    expect(
      get(
        {people: [{name: 'John'}, {name: 'Tim'}]},
        'people<._error>')).toEqual(
      [[[{name: 'John'}, {name: 'Tim'}]], ['people._error']])
  })
  it('should ignore paths enclosed by {} when setting paths', function() {
    expect(
      get(
        {people: [{name: 'John'}, {name: 'Tim'}]},
        'people{[0].name}')).toEqual(
      [['John'], ['people']])
  })
  it('should work when {} and <> are used together', function() {
    expect(
      get(
        {people: [{name: 'John'}, {name: 'Tim'}]},
        'people{[0].name}<._error>')).toEqual(
      [['John'], ['people._error']])
  })
  it('should iterate through objects when "[]" is used', function() {
    expect(
      get(
        {people: [{name: 'John'}, {name: 'Suzaku'}]},
        'people[].name')).toEqual(
      [['John', 'Suzaku'], ['people.0.name', 'people.1.name']])
  })
  it('should flatten results when "[]" is used multiple times', function() {
    expect(
      get(
        {teachers: [{students: ['John']}, {students: ['Suzaku', 'Ophelia']}]},
        'teachers[].students[]')).toEqual(
      [['John', 'Suzaku', 'Ophelia'], ['teachers.0.students.0', 'teachers.1.students.0', 'teachers.1.students.1']])
  })
  it('should return no values if "[]" is used and array is empty', function() {
    expect(
      get(
        {},
        'teachers[]')).toEqual(
      [[], []])
    expect(
      get(
        {},
        'teachers[].students[]')).toEqual(
      [[], []])
  })
  it('should throw an error if "[]" is enclosed with <>\'s or {}\'s', function() {
    try {
      get({}, 'teachers<[]>')
    } catch (e) {
      expect(e.message).toBe('validate: do not enclose "[]" with <>\'s or {}\'s (teachers<.[].>)')
    }
    try {
      get({}, 'teachers{[]}')
    } catch (e) {
      expect(e.message).toBe('validate: do not enclose "[]" with <>\'s or {}\'s (teachers{.[].})')
    }
  })
})

describe('traverse', function() {
  it('should traverse objects', function() {
    expect(
      traverse(_.isPlainObject, {title: 'Lemur Town', chapters: ['Chapter 1']})).toEqual(
      [['title', 'Lemur Town'], ['chapters', ['Chapter 1']]])
  })
  it('should prefix paths', function() {
    expect(
      traverse(_.isPlainObject, {title: 'Lemur Town', chapters: ['Chapter 1']}, 'author.books[0]')).toEqual(
      [['author.books.0.title', 'Lemur Town'], ['author.books.0.chapters', ['Chapter 1']]])
  })
  it('should be possible to change the qualifier', function() {
    const qualifier = v => _.isPlainObject(v) || v instanceof Array
    expect(
      traverse(qualifier, {title: 'Lemur Town', chapters: ['Chapter 1']}, 'author.books[0]')).toEqual(
      [['author.books.0.title', 'Lemur Town'], ['author.books.0.chapters.0', 'Chapter 1']])
  })
})

describe('defaultValidate', function() {
  it('should fail on null / undefined / empty strings', function() {
    expect(defaultValidate(null, 'key')).toBe('Key is required')
    expect(defaultValidate(undefined, 'key')).toBe('Key is required')
    expect(defaultValidate('', 'key')).toBe('Key is required')
  })
  it('should pass on everything else', function() {
    expect(defaultValidate('Test', 'key')).toBe(false)
    expect(defaultValidate({}, 'key')).toBe(false)
    expect(defaultValidate([], 'key')).toBe(false)
    expect(defaultValidate(6, 'key')).toBe(false)
    expect(defaultValidate(0, 'key')).toBe(false)
    expect(defaultValidate(true, 'key')).toBe(false)
    expect(defaultValidate(false, 'key')).toBe(false)
    const Lemur = function(name) { this.name = name }
    expect(defaultValidate(new Lemur('Jerome'), 'key')).toBe(false)
  })
})
