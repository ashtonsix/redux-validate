const _ = require('lodash')
const test = require('tape')
const index = require('../index.js')
const validate = index.default
const createValidate = index.createValidate

test(t => {
  t.plan(8)
  t.deepEqual(validate()({title: ''}), {title: 'Title is required'})
  t.deepEqual(validate(['title'])({title: ''}), {title: 'Title is required'})
  t.deepEqual(validate({title: 'Subject needed'})({title: ''}), {title: 'Subject needed'})
  t.deepEqual(validate({password: p => p.length <= 5 && 'Password must be longer than 6 charachters'})({password: 'correcthorsebatterystaple'}), {})
  t.deepEqual(validate(v => v.frostBolt && v.fireBolt && ({magic: 'You can only pick one'}))({frostBolt: true, fireBolt: true}), {magic: 'You can only pick one'})
  t.deepEqual(validate(['title']).then({subject: 'Content missing'})({title: 'Red Book', subject: ''}), {subject: 'Content missing'})
  const newValidate = createValidate((v, k) => !v && `You forgot ${_.startCase(k)}`)
  t.deepEqual(newValidate()({title: ''}), {title: 'You forgot Title'})
  t.deepEqual(validate(null, (v, k) => !v && `You forgot ${_.startCase(k)}`)({title: ''}), {title: 'You forgot Title'})
})
