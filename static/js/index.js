$(function() {
    var S = window.S || {};
    
    S.SelectionKeeper = function () {
        this.selected = null;
        this.prechange = null;
    };
    _.extend(S.SelectionKeeper.prototype, Backbone.Events, {
        set: function (selected) {
            if(this.selected && this.prechange) {
                this.prechange();
            }

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
    
    S.CurrentInstance.prechange = function() {
        S.TheEditor.save();
    }

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
        },
        initialize: function() {
            var values = {};

            var concept = this.get('parent');
            _.each(concept.get('fields'), function(field){
                values[field] = null;
            });

            this.set({values: values}, {silent: true});
        }
    });

    S.InstanceCollection = Backbone.Collection.extend({
        model: S.Instance
    });

    S.Concept = Backbone.Model.extend({
        defaults: {
            editor_js: [],
            editor_css: [],
            css_rules: {}
        },
        initialize: function() {
            var tmpl_selector = "#" + this.get('name') + "-editor";
            this.editor_tmpl = _.template($(tmpl_selector).html());

            this.set({
                instances: new S.InstanceCollection()
            }, {silent: true});
        }
    });

    S.ConceptCollection = Backbone.Collection.extend({
        model: S.Concept
    });

    S.Concepts = new S.ConceptCollection();

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
        selectInstance: function() {
            S.CurrentInstance.set(this.model);
        }
    });

    S.ConceptList = Backbone.View.extend({
        el: $("#concept-list"),
        initialize: function() {
            this.render();
        },
        render: function() {
            this.$el.empty();
            S.Concepts.each(_.bind(this.renderOne, this));
        },
        renderOne: function(c) {
            var v = new S.ConceptListView({model: c});
            this.$el.append(v.render().el);
        }
    });

    S.InstanceList = Backbone.View.extend({
        el: $("#instance-list"),
        initialize: function() {
            S.CurrentConcept.bind('change', this.render, this);
        },
        render: function() {
            this.$el.empty();
            var concept = S.CurrentConcept.get();
            concept.get('instances').each(_.bind(this.renderOne, this));
        },
        renderOne: function(c) {
            var v = new S.InstanceListView({model: c});
            this.$el.append(v.render().el);
        }
    });

    S.AddInstanceLink = Backbone.View.extend({
        el: $("#add-instance-link"),
        events: {
            'click': 'addInstance'
        },
        addInstance: function(e) {
            if(e != undefined) {
                e.preventDefault();
            }

            var concept = S.CurrentConcept.get();
            var instance = new S.Instance({
                parent: concept
            });

            concept.get('instances').push(instance);
            S.TheInstanceList.renderOne(instance);
            return instance;
        }
    });

    S.Editor = Backbone.View.extend({
        el: $("#editor"),
        initialize: function() {
            S.CurrentInstance.bind('change', this.render, this);
            this.loader = new Loader();
        },
        render: function() {
            var self = this;

            var instance = S.CurrentInstance.get();
            var concept = instance.get('parent');

            var editor_html = $(concept.editor_tmpl(instance.get('values')));

            this.$el.html(editor_html);
            this.loader.load({
                js: concept.get('editor_js'),
                css: concept.get('editor_css')
            }, function() {
                concept.get('load')(self.$el, instance.get('values'));
            });

            var css = this.serializeCSSRules(concept.get('css_rules'));
            this.appendCSSBlock(css);
        },
        serializeCSSRules: function(rules) {
            var output = "";
            _.each(rules, function(styles, selector) {
                output += selector + " {";
                
                _.each(styles, function(val, key){
                    output += key + ": " + val + ";";
                });

                output += "} ";
            });

            return output;
        },
        appendCSSBlock: function(css) {
            var block = $("<style>");
            block.html(css);
            this.$el.append(block);
        },
        save: function() {
            var instance = S.CurrentInstance.get();
            var concept = instance.get('parent');
            var values = concept.get('save')(this.$el);
            instance.set({values: values});
        }
    });

    var models = new S.Concept({
        name: 'models',
        display_name: 'Models',
        id_field: 'name',
        fields: ['name', 'fields', 'views', 'methods'],
        editor_js: ["/static/js/codemirror.js", "/static/js/mode/xml.js"],
        editor_css: ["/static/css/codemirror.css"],
        css_rules: {
            ".section": {
                "display": "none"
            },
            ".template": {
                "display": "none"
            }
        },
        load: function(root, values) {
            root.find('.tab').click(function(e){
                var klass = $(this).attr('href');
                root.find('.section').hide();
                root.find('.' + klass).show();

                e.preventDefault();
            });

            var field_list = root.find(".field-list");
            var method_list = root.find(".method-list");
            var field_template = root.find(".field-template");
            var method_template = root.find(".method-template");

            root.find('.add-field-link').click(function(e){
                var new_field = field_template.clone();
                new_field.removeClass('template');
                field_list.append(new_field);

                e.preventDefault();
            });

            root.find('.add-method-link').click(function(e){
                var new_field = method_template.clone();
                new_field.removeClass('template');
                method_list.append(new_field);

                e.preventDefault();
            });
        },
        save: function(root) {
        }
    });
    

    var pages = new S.Concept({
        name: 'pages',
        display_name: 'Pages',
        id_field: 'url',
        fields: ['url', 'body'],
        editor_js: ["/static/js/codemirror.js", "/static/js/mode/xml.js"],
        editor_css: ["/static/css/codemirror.css"],
        load: function(root, values) {
            root.find('.url').val(values.url);

            this.foo = "bar";

            var body = root.find('.body');
            body.val(values.body);

            //FIXME: Setting attributes on 'this' probably isn't great...
            this.cm = CodeMirror.fromTextArea(body.get(0), {
                mode: 'xml',
                lineNumbers: true
            });
        },
        save: function(root) {
            return {
                url: root.find('.url').val(),
                body: this.cm.getValue()
            };
        }
    });

    var partials = new S.Concept({
        name: 'partials',
        display_name: 'Partials',
        id_field: 'name',
        fields: ['name', 'body'],
        load: function(root, values) {
            root.find('.name').val(values.name);
            root.find('.body').val(values.body);
        },
        save: function(root) {
            return {
                name: root.find('.name').val(),
                body: root.find('.body').val()
            };
        }
    });

    S.Concepts.reset([models, pages, partials]);

    S.TheConceptList = new S.ConceptList();
    S.TheInstanceList = new S.InstanceList();
    S.TheAddInstanceLink = new S.AddInstanceLink();
    S.TheEditor = new S.Editor();
    
    S.CurrentConcept.set(S.Concepts.at(0));
    instance = S.TheAddInstanceLink.addInstance();
    S.CurrentInstance.set(instance);

    window.S = S;
});
