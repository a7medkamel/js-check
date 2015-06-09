var _         = require('underscore')
  , chai      = require('chai')
  , should    = require('chai').should()
  ;

function find(root, walk) {
  var ret = [];

  // walk.ancestor(ast, {
  //   Expression : function(node, state){
  //     if (node.type === 'MemberExpression') {
  //       // todo [akamel] ensure that the chain has enough parents in it.

  //       var chain = ([].concat(state)).reverse();
  //       var is_view   = node.property.name === 'View' && node.object.name.toLowerCase() === 'backbone'
  //         , is_extend = chain[1].type === 'MemberExpression' && chain[1].property.name === 'extend'
  //         , is_call = chain[2].type === 'CallExpression'
  //         ;

  //       if (is_view && is_extend && is_call) {
  //         ret = { node : chain[2], state : state };
  //       }
  //     }
  //   }
  // });

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
              , initialize  = _.find(def.properties, function(i){ return i.type === 'Property' && i.key.name === 'initialize'; })
              ;

            if (initialize) {
              ret.push(initialize);
            }
          }
        }
      }
    }
  });

  // ret = walk.findNodeAt(root, null, null, function(nodeType, node){
  //   if (nodeType === 'CallExpression') {
  //     if (
  //           node.callee.property
  //       &&  node.callee.property.name === 'extend' 
  //       &&  node.callee.object
  //       &&  node.callee.object.property
  //       &&  node.callee.object.property.name === 'View'
  //       &&  node.callee.object.object
  //       &&  node.callee.object.object.name.toLowerCase() === 'backbone'
  //     ) {
        
  //       return true;
  //     }
  //   }
  // });

  return ret;
}

function check(init) {
  // console.dir(init.loc, { depth : 10 });
  
  var fct = init.value;

  fct.type.should.equal('FunctionExpression', 'initialize in a backbone view should be a function');
  fct.params.should.be.instanceof(Array).and.have.lengthOf(1, 'initialize in a backbone view should have 1 parameter');
  fct.params[0].name.should.equal('options', 'initialize in backbone view should have a single parameter called options');

  var block = fct.body;
  block.type.should.equal('BlockStatement');

  var body = block.body;

  var first = body[0];

  first.type.should.equal('ExpressionStatement');

  var assign = first.expression;

  should.exist(assign.operator, 'operator should exist');
  assign.operator.should.equal('=');

  var left = assign.left;
  var right = assign.right;

  left.type.should.equal('MemberExpression');
  left.property.name.should.equal('options'); //, 'expected left to be this.options');

  right.type.should.equal('LogicalExpression');
  right.operator.should.equal('||');
  right.left.name.should.equal('options');
  right.right.type.should.equal('ObjectExpression');
  right.right.properties.should.be.instanceof(Array).and.have.lengthOf(0);
  // 'expected right to be options || {}'
}

module.exports = {
  area      : 'Backbone',
  name      : 'View/initialize/this.options',
  desc      : 'Ensure that a backbone view\'s initialize function takes one argument called "options" and that we set `this.options = options || {}`',
  fix       : 'add this.options = options || {};',
  qualifier : '?',
  find      : find,
  check     : check
};