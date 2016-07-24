import _ from 'lodash'
import {PropTypes} from 'react'
import test from 'tape'
import validate, {createValidate} from '../index.js'

test('simple', t => {
  t.plan(4)
  t.deepEqual(
    validate()(
    {title: ''}),
    {title: 'Title is required'})
  t.deepEqual(
    validate(['title'])(
    {title: ''}),
    {title: 'Title is required'})
  t.deepEqual(
    validate({title: 'Subject needed'})(
    {title: ''}),
    {title: 'Subject needed'})
  t.deepEqual(
    validate({title: 'Subject needed'})(
    {title: "There's a subject, don't worry"}),
    {})
})

test('functions', t => {
  t.plan(2)
  t.deepEqual(
    validate({password: p => p.length <= 5 && 'Password must be longer than 6 charachters'})(
    {password: 'correcthorsebatterystaple'}),
    {})
  t.deepEqual(
    validate(v => v.frostBolt && v.fireBolt && ({magic: 'You can only pick one'}))(
    {frostBolt: true, fireBolt: true}),
    {magic: 'You can only pick one'})
})

test('chaining', t => {
  t.plan(1)
  t.deepEqual(
    validate(['title']).then({subject: 'Content missing'})(
    {title: 'Red Book', subject: ''}),
    {subject: 'Content missing'})
})

test('new default validate', t => {
  t.plan(2)
  const newValidate = createValidate((v, k) => !v && `You forgot ${_.startCase(k)}`)
  t.deepEqual(
    newValidate()(
    {title: ''}),
    {title: 'You forgot Title'})
  t.deepEqual(
    validate(null, (v, k) => !v && `You forgot ${_.startCase(k)}`)(
    {title: ''}),
    {title: 'You forgot Title'})
})

test('react propTypes', t => {
  t.plan(2)
  const newValidate = createValidate(PropTypes.string.isRequired)
  t.deepEqual(
    newValidate(['title'])(
    {title: 5}),
    {title: 'Invalid prop `title` of type `number` supplied to `redux-validate`, expected `string`.'})
  t.deepEqual(
    validate({gender: PropTypes.oneOf(['Male', 'Female'])})(
    {gender: 'Transgender'}),
    {gender: 'Invalid prop `gender` of value `Transgender` supplied to `redux-validate`, expected one of ["Male","Female"].'})
})
