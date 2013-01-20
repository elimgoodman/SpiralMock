(function(){
    
    var Loader = function() {
        this.files = {};
    };

    Loader.prototype = {
        load: function(files, cb) {
            var self = this;
            
            var total_files = files.js.length + files.css.length;
            var loaded_files = 0;
            
            if(total_files == 0) {
                return cb();
            }

            var file_loaded = function() {
                loaded_files++;
                
                if(loaded_files == total_files) {
                    cb();
                }
            }

            _.each(files.js, function(file){
                self.loadJS(file, file_loaded);
            });

            _.each(files.css, function(file){
                self.loadCSS(file, file_loaded);
            });
        },
        loadCSS: function(file, cb, fetch) {
            var self = this;

            if(this.files[file] == true) {
                cb();
            } else {
                $('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', file));
                self.files[file] = true;
                cb();
            }
        },
        loadJS: function(file, cb) {
            var self = this;

            if(this.files[file] == true) {
                cb();
            } else {
                $.getScript(file, function(data){
                    self.files[file] = true;
                    cb();
                });
            }
        }
    };

    window.Loader = Loader;
})();
