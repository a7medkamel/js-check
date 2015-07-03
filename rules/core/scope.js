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

function check(node, options) {
  var globals = [
                    'window'
                  , 'Error'
                  , 'Number'
                  , 'Boolean'
                  , 'Date'
                  , 'isFinite'
                  , 'String'
                  , 'Object'
                  , 'Function'
                  , 'HTMLElement'
                  , 'setInterval'
                  , 'clearInterval'
                  , 'setTimeout'
                  , 'clearTimeout'
                  , 'arguments'
                  , 'document'
                  , 'parseInt'
                  , 'parseFloat'
                  , 'Math'
                  , 'encodeURIComponent'
                  , 'JSON'
                  , 'alert'
                  , 'RegExp'
                  , 'undefined'
                  , 'decodeURIComponent'
                  , 'unescape'
                  , 'isNaN'
                  , 'Array'
                  , 'prompt'
                  , 'confirm'
                ]
    , warning = []
    , scopes  = []
    ;

  _.each(options.config.global, function(value, key){
    var op    = '$set'
      , data  = value
      ;

    switch(key) {
      case '$set': 
      case '$push': 
        op = key;
        data = value;
      break;
    }

    var type  = _.keys(data)[0]
      , set   = _.values(data)[0]
      ;

    if (op === '$set') {
      if (type === 'ok') {
        globals = set;
      }

      if (type === 'warn') {
        warning = set;
      }
    }

    if (op === '$push') {
      if (type === 'ok') {
        globals.push.apply(globals, set);
      }

      if (type === 'warn') {
        warning.push.apply(globals, set);
      }
    }
  });

  function upsert_scope(state) {
    var node  = _.last(state)
      , scope = _.findWhere(scopes, { node : node })
      ;

    if (!scope) {
      scope = { 
        node        : node,
        state       : state,
        // used        : [],
        declared    : {},
        params      : _.object(_.map(node.params, function(n){ return n.name; }), [])
        // catch_param : []
      };

      scopes.push(scope);
    }

    return scope;
  }

  function read_scope(node) {
    return _.findWhere(scopes, { node : node });
  }

  function find_scope(state) {
    var idx = _.findLastIndex(state, function(node){
                  switch (node.type) {
                    case 'FunctionExpression':
                    case 'FunctionDeclaration':
                    return true;
                    break;
                  }
              });

    var parents = _.first(state, idx + 1);
    return upsert_scope(parents);
  }

  function find_scopes(state) {
    return _.compact(_.map(state, function(node, i, arr){
      switch (node.type) {
        case 'TryStatement':
          if (node.handler && node.handler.body === arr[i+1]) {
            return { 
              node    : node,
              params  : _.object([node.handler.param.name], [])
            }
          }
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        return read_scope(node);
        break;
      }
    }));
  }

  // should.exist(fct, 'define module should have a function as second argument');

  walk.ancestor(node, {
    VariableDeclaration : function(node, state){
      var scope = find_scope(state);

      _.each(node.declarations, function(decl){
        scope.declared[decl.id.name] = 0;
      });
    },
    FunctionDeclaration : function(node, state) {
      upsert_scope(state);

      if (node.id) {
        var parents = _.initial(state);
        var scope = find_scope(parents);
        if (!scope.declared) {
          console.log(scope);
        }
        scope.declared[node.id.name] = 0;
      }
    },
    FunctionExpression : function(node, state) {
      upsert_scope(state);
    }
  });

  var errors = [];

  walk.ancestor(node, {
    Identifier : function(node, state){
      var scopes  = find_scopes(state)
        , name    = node.name
        ;

      var found = false;
      _.each(scopes, function(scope){
        if (_.has(scope.declared, name) || _.has(scope.params, name)) {
          found = true;
        }
      });

      if (!found) {
        found =  _.contains(globals, name);
      }

      if (!found) {
        errors.push(new chai.AssertionError('accessing global identifier "' + name +'"', {
            name  : name
          , at    : node.loc
          , level : _.contains(warning, name)? 'warning' : 'error'
        }));
      }
    }
  });

  return errors;
}

module.exports = {
  type      : 'js',
  area      : 'Core',
  name      : 'scope',
  fix       : 'add missing dependencies',
  qualifier : '?',
  find      : find,
  check     : check
};