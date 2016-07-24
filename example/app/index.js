import React from 'react'
import ReactDOM from 'react-dom'

import validate from '../../index'

console.log(validate()({title: 'hadj'}))

ReactDOM.render(
  <h1>Hello, world!</h1>,
  document.getElementById('root')
)
