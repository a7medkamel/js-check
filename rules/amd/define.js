var _         = require('underscore')
  , chai      = require('chai')
  , should    = require('chai').should()
  , walk      = require('../../node_modules/acorn/dist/walk')
  ;

// todo [akamel] chose how we want to ref to walk...
function find(root, walk) {
  var ret = [];

  walk.ancestor(root, {
    CallExpression : function(node, state){
      if (node.type === 'CallExpression') {
        if (
              node.callee.name === 'define' 
          &&  node.callee.type === 'Identifier'
        ) {
          ret.push(node);
        }
      }
    }
  });

  return ret;
}

function check(node) {
  node.arguments.should.exist;
  node.arguments.should.be.instanceof(Array);

  if (node.arguments[0].type === 'ArrayExpression') {
    node.arguments[1].should.exist;

    ['ObjectExpression', 'FunctionExpression'].should.include(node.arguments[1].type);
    // node.arguments[1].type.should.be.equal('FunctionExpression');
  } else {
    ['ObjectExpression', 'FunctionExpression'].should.include(node.arguments[0].type);
  }
}

module.exports = {
  type      : 'js',
  area      : 'RequireJS',
  name      : 'define',
  fix       : 'module doesn\'t have a handling function',
  qualifier : '{1}',
  find      : find,
  check     : check
};