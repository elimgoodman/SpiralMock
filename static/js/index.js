$(function() {
    var S = window.S || {};
    
    S.SelectionKeeper = function () {
        this.selected = null;
    };
    _.extend(S.SelectionKeeper.prototype, Backbone.Events, {
        set: function (selected) {
            if(this.selected) {
                this.selected.set({
                    selected: false
                });
            }
            this.selected = selected;
            this.selected.set({
                selected: true
            });
            this.trigger('change');
        },
        get: function () {
            return this.selected;
        }
    });

    S.CurrentConcept = new S.SelectionKeeper();
    S.CurrentInstance = new S.SelectionKeeper();

    S.MView = Backbone.View.extend({
        render: function() {
            this.$el.html(this.template(this.getTemplateContext()));
            this.$el.data('backbone-model', this.model);
            this.postRender();
            return this;
        },
        postRender: $.noop,
        getTemplateContext: function() {
            return this.model.toJSON();
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.template = _.template($("#" + this.template_id).html());
            this.postInit();
        },
        postInit: $.noop,
        template_id: null,
        setClassIf: function (if_cb, class_name) {
            if(if_cb()) {
                this.$el.addClass(class_name);
            } else {
                this.$el.removeClass(class_name);
            }
        },
        setSelectedClass: function () {
            var self = this;
            this.setClassIf(function () {
                return self.model.get('selected') == true;
            }, 'selected');
        }
    });

    S.Instance = Backbone.Model.extend({
        defaults: {
            values: {}
        }
    });

    S.InstanceCollection = Backbone.Collection.extend({
        model: S.Instance
    });

    S.Concept = Backbone.Model.extend({
        initialize: function() {
            var tmpl_selector = "#" + this.get('name') + "-editor";
            this.editor_tmpl = _.template($(tmpl_selector).html());
        }
    });

    S.ConceptCollection = Backbone.Collection.extend({
        model: S.Concept
    });

    S.Concepts = new S.ConceptCollection();

    S.Concepts.push(new S.Concept({
        name: 'pages',
        display_name: 'Pages',
        id_field: 'url'
    }));
    
    S.ConceptListView = S.MView.extend({
        tagName: 'li',
        className: 'concept',
        template_id: 'concept-list-tmpl',
        events: {
            'click': 'selectConcept'
        },
        postRender: function() {
            this.setSelectedClass();
        },
        selectConcept: function() {
            S.CurrentConcept.set(this.model);
        }
    });

    S.InstanceListView = S.MView.extend({
        tagName: 'li',
        className: 'instance',
        template_id: 'instance-list-tmpl',
        events: {
            'click': 'selectInstance'
        },
        postRender: function() {
            this.setSelectedClass();
        },
        selectConcept: function() {
            S.CurrentInstance.set(this.model);
        }
    });

    S.ConceptList = Backbone.View.extend({
        el: $("#concept-list"),
        initialize: function() {
            this.render();
        },
        render: function() {
            var self = this;

            S.Concepts.each(function(c){
                var v = new S.ConceptListView({model: c});
                self.$el.append(v.render().el);
            });
        }
    });

    S.InstanceList = Backbone.View.extend({
        el: $("#instance-list"),
        initialize: function() {
            S.CurrentConcept.bind('change', this.render, this);
        },
        render: function() {
            var self = this;
            var concept = S.CurrentConcept.get();

            Instances.each(function(c){
                var v = new S.InstanceListView({model: c});
                self.$el.append(v.render().el);
            });
        }
    });

    S.AddInstanceLink = Backbone.View.extend({
        el: $("#add-instance-link"),
        events: {
            'click': 'addInstance'
        },
        addInstance: function() {
            var concept = S.CurrentConcept.get();
            var instance = new S.Instance({
                parent: concept
            });

            concept.get('instances').push(instance);
            return false;
        }
    });

    new S.ConceptList();
    new S.InstanceList();
    new S.AddInstanceLink();

    window.S = S;
});
