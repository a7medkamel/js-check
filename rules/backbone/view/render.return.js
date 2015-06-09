var _         = require('underscore')
  , chai      = require('chai')
  , should    = require('chai').should()
  ;

function find(root, walk) {
  var ret = [];

  walk.ancestor(root, {
    Expression : function(node, state){
      if (node.type === 'CallExpression') {
        if (
              node.callee.property
          &&  node.callee.property.name === 'extend' 
          &&  node.callee.object
          &&  node.callee.object.property
          &&  node.callee.object.property.name === 'View'
          &&  node.callee.object.object
          &&  node.callee.object.object.name.toLowerCase() === 'backbone'
        ) {
          if (_.size(node.arguments)) {
            var def         = node.arguments[0]
              , render      = _.find(def.properties, function(i){ return i.type === 'Property' && i.key.name === 'render'; })
              ;

            if (render) {
              ret.push(render);
            }
          }
        }
      }
    }
  });

  return ret;
}

function check(render) {
  var fct = render.value;

  fct.type.should.equal('FunctionExpression', 'render in a backbone view should be a function', { at : fct.loc });
  // fct.params.should.be.instanceof(Array).and.have.lengthOf(1, 'initialize in a backbone view should have 1 parameter');
  // fct.params[0].name.should.equal('options', 'initialize in backbone view should have a single parameter called options');

  var block = fct.body;
  block.type.should.equal('BlockStatement', { at : block.loc });

  var body = block.body;

  var last = _.last(body);
  last.type.should.equal('ReturnStatement', { at : last.loc });
  last.argument.type.should.equal('ThisExpression', { at : last.loc });
}

module.exports = {
  area      : 'Backbone',
  name      : 'View/render/return.this',
  fix       : 'add return this at end of render method',
  // desc      : 'Ensure that a backbone view\'s initialize function takes one argument called "options" and that we set `this.options = options || {}`',
  qualifier : '?',
  find      : find,
  check     : check
};