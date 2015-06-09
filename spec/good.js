define([
    'lib/underscore',
    'lib/backbone',
  ],
  function(_, backbone) {
    'use strict';

    var defaults = {
      statusText: ''
    };

    var view = backbone.View.extend({
      initialize: function(options) {
        this.options = options || {};
        this.options.model = _.defaults({}, options.model, defaults);
      },

      render: function() {
        ko.applyBindings(this.ko_model, this.el);
        return this;
      }
    });

    return view;
  });