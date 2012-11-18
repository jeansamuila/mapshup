/*
 * mapshup - Webmapping made easy
 * http://mapshup.info
 *
 * Copyright Jérôme Gasperi, 2011.12.08
 *
 * jerome[dot]gasperi[at]gmail[dot]com
 *
 * This software is a computer program whose purpose is a webmapping application
 * to display and manipulate geographical data.
 *
 * This software is governed by the CeCILL-B license under French law and
 * abiding by the rules of distribution of free software.  You can  use,
 * modify and/ or redistribute the software under the terms of the CeCILL-B
 * license as circulated by CEA, CNRS and INRIA at the following URL
 * "http://www.cecill.info".
 *
 * As a counterpart to the access to the source code and  rights to copy,
 * modify and redistribute granted by the license, users are provided only
 * with a limited warranty  and the software's author,  the holder of the
 * economic rights,  and the successive licensors  have only  limited
 * liability.
 *
 * In this respect, the user's attention is drawn to the risks associated
 * with loading,  using,  modifying and/or developing or reproducing the
 * software by the user in light of its specific status of free software,
 * that may mean  that it is complicated to manipulate,  and  that  also
 * therefore means  that it is reserved for developers  and  experienced
 * professionals having in-depth computer knowledge. Users are therefore
 * encouraged to load and test the software's suitability as regards their
 * requirements in conditions enabling the security of their systems and/or
 * data to be ensured and,  more generally, to use and operate it in the
 * same conditions as regards security.
 *
 * The fact that you are presently reading this means that you have had
 * knowledge of the CeCILL-B license and that you accept its terms.
 */
/*********************************************
 * PLUGIN: AddLayer
 *
 * This plugin allows user to add a layer to the map
 * 
 *********************************************/
(function(msp) {
    
    msp.Plugins.AddLayer = function() {
        
        /*
         * Only one Context object instance is created
         */
        if (msp.Plugins.AddLayer._o) {
            return msp.Plugins.AddLayer._o;
        }
        
        
        /*
         * Initialize plugin
         */
        this.init = function(options) {
            
            var i,
            j,
            l,
            m,
            name,
            predefined,
            self = this,
            dd = true; // By default, drag&drop is enabled
                
            /**
             * Init options
             */
            self.options = options || {};

            /**
             * Allowed layerTypes
             * If no allowed layerTypes are specified, the plugin is discarded
             */
            if (!options.allowedLayerTypes || options.allowedLayerTypes.length === 0) {
                return null;
            }

            /*
             * Set upload service url
             */
            $.extend(self.options,
            {
                allowedExtensions:msp.Config["upload"].allowedExtensions || [],
                allowedLayerTypes:self.options.allowedLayerTypes || [],
                allowedMaxNumber:1,
                allowedMaxSize:msp.Config["upload"].allowedMaxSize || 1000000,
                magicServiceUrl:self.options.magicServiceUrl || "/utilities/magic.php?",
                uploadServiceUrl:msp.Config["upload"].serviceUrl || "/utilities/upload.php?"
            });

            /*
             * Firefox < 4 does not support HTML 5 Drag&Drop
             */
            if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                if (new Number(RegExp.$1) < 4) {
                    dd = false;
                }
            }
            
            /*
             * In other case
             */
            if (dd) {

                /*
                 * Create an info div mask upon msp.$mcontainer
                 */
                self.$ddzone = msp.Util.$$('#ddzone', msp.$mcontainer).html('<div class="content">'+msp.Util._("Drop !")+'</div>');

                /*
                 * The valid drop zone is the whole Map div
                 */
                $('.content', self.$ddzone)
                .bind(
                    'dragleave',
                    function(e) {
                        self.$ddzone.hide();
                        e.preventDefault();
                        e.stopPropagation();
                    })
                .bind(
                    'dragover',
                    function(e) {
                        self.$ddzone.show();
                        e.preventDefault();
                        e.stopPropagation();
                    })
                .bind(
                    'drop',
                    function(e) {
                        
                        /*
                         * Hide drop information
                         */
                        self.$ddzone.hide();

                        /*
                         * Stop events
                         */
                        e.preventDefault();
                        e.stopPropagation();

                        /*
                         * HTML5 : get dataTransfer object
                         */
                        var files = e.originalEvent.dataTransfer.files;

                        /*
                         * If there is no file, we assume that user dropped
                         * something else...a url for example !
                         */
                        if (files.length === 0) {
                            self.guess(e.originalEvent.dataTransfer.getData('Text'));
                        }
                        /*
                         * User dropped files => upload it to the server
                         */
                        else {
                            self.upload(files);
                        }
                    });

                msp.$map
                .bind(
                    'dragenter',
                    function(e) {
                        self.$ddzone.show();
                        e.preventDefault();
                        e.stopPropagation();
                    });

            }
            
            /**
             * Update layerTypes with the list of available layers
             */
            for (i = 0, l = self.options.allowedLayerTypes.length; i < l; i++){

                name = self.options.allowedLayerTypes[i].name;

                /**
                 * options should define an array of availableLayers
                 */
                predefined = self.options.allowedLayerTypes[i].predefined || [];

                /**
                 * Add layer description to Map.predefined
                 */
                if (msp.Map.layerTypes[name]) {
                    for (j = 0, m = predefined.length; j < m; j++){
                        predefined[j].type = name;
                        msp.Map.predefined.add(predefined[j]);
                    }
                }
            }

            return self;            
            
        };
        
        /*
         * Guess the layer type from url
         *
         * @input {String} url : url to resolve
         */
        this.guess = function(url) {

            var scope = this;
            
            msp.Util.ajax({
                url:msp.Util.getAbsoluteUrl(scope.options.magicServiceUrl)+msp.Util.abc+"&url="+encodeURIComponent(msp.Util.repareUrl($.trim(url))),
                async:true,
                dataType:"json",
                success:function(result){
                    if (result.error) {
                        msp.Util.message(result.error["message"]);
                    }
                    else {

                        /*
                         * If the type is unknown, ask for user
                         */
                        if (result["type"] === "unknown") {
                            scope.askType(result);
                        }
                        else {
                            scope.add(result, scope);
                        }

                    }

                },
                error:function() {
                    msp.Util.message(msp.Util._("Error : cannot perform action"));
                }
            },{
                title:msp.Util._("Layer detection in progress..."),
                cancel:true
            });

        };
        
        /*
         * Ask user for layer type
         */
        this.askType = function(p) {
            
            var i,l,t,self=this,list = [];
            
            for (i = 0, l = self.options.allowedLayerTypes.length; i < l; i++) {
                t = self.options.allowedLayerTypes[i].name;
                list.push({
                    title:msp.Util._(t),
                    value:t
                })
            }
            msp.Util.askFor({
                title:msp.Util._("Add layer"),
                content:msp.Util._("What is the type for this layer ?"),
                dataType:"list",
                value:list,
                callback:function(v){
                    p["type"] = v;
                    self.add(p, self);
                }
            });
            
        };

        /**
         * Upload files to server
         *
         * @input {Array} files : array of files to upload
         * 
         */
        this.upload = function(files) {

            var i,
            form,
            id,
            http,
            validFiles = [],
            ids = "",
            count = 0,
            scope = this,
            cpt = {
                'shp':3,
                'shx':3,
                'dbf':3,
                'jpg':999
            };

            /*
             * Tell user that we are processing things !
             */
            msp.mask.add({
                title:msp.Util._("Upload data")+"...",
                cancel:false
            });

            /*
             * Roll over files and check validity
             */
            $(files).each(function(key, file) {

                /*
                 * Some server protection
                 * Disallow files that are nothing to do with layers
                 */
                var c,
                i,
                extension = file.name.split('.').pop().toLowerCase(),
                isValid = false;
                    
                for (i = scope.options.allowedExtensions.length; i--;) {

                    /*
                     * File size is too big
                     */
                    if (file.fileSize > scope.options.allowedMaxSize) {
                        msp.Util.message(msp.Util._("Error : file is to big"));
                        isValid = false;
                        return false;
                    }

                    /*
                     * Extension is valid
                     */
                    if (extension === scope.options.allowedExtensions[i]) {

                        isValid = true;

                        c = cpt.hasOwnProperty(extension) ? cpt.extension : 1;

                        if (count++ >= c) {
                            msp.Util.message(msp.Util._("Error : only one file at a time is allowed"));
                            isValid = false;
                            return false;
                        }

                        validFiles.push(file);

                        break;
                    }
                }
                if (isValid) {
                    id = msp.Util.getId();
                    ids += ids !== "" ? "," + id : id;
                }
                
                return true;

            });

            /*
             * Upload validFiles
             */
            if (validFiles.length > 0) {


                /*
                 * If ids is set
                 */
                ids = ids !== undefined ? "&ids="+ids : "";

                /*
                 * Work-around for Safari occasionally hanging when doing a
                 * file upload.  For some reason, an additional HTTP request for a blank
                 * page prior to sending the form will force Safari to work correctly.
                 *
                 * See : http://www.smilingsouls.net/Blog/20110413023355.html
                 */
                $.get('./blank.html');

                http = new XMLHttpRequest();

                /*
                 * Listen the end of the process
                 */
                http.onreadystatechange = function() {

                    var i,l,result;
                    
                    /*
                     * End of the process is readyState 4
                     * Successfull status is 200 or 0 (for localhost)
                     */
                    if (http.readyState === 4 && (http.status === 200 || http.status === 0)) {

                        msp.mask.hide();

                        result = JSON.parse(http.responseText);

                        /*
                         * In case of success, roll over processed items
                         */
                        if (result.error) {
                            msp.Util.message(result.error["message"]);
                        }
                        else {
                            if (result.items) {
                                
                                for (i = 0, l = result.items.length; i < l;i++) {
                                    
                                    /*
                                     * If the type is unknown we ask user for some usefull help :)
                                     */
                                    if (!result.items[i]["ignore"] && result.items[i]["type"] === "unknown") {
                                        scope.askType(result.items[i]);
                                    }
                                    else {
                                        scope.add(result.items[i], scope);
                                    }
                                }
                            }
                        }
                    }
                };

                if (typeof(FormData) !== 'undefined') {

                    form = new FormData();
                    form.append('path', '/');

                    for (i = 0, l = files.length; i < l; i++) {
                        form.append('file[]', files[i]);
                    }
                    
                    http.open('POST', msp.Util.getAbsoluteUrl(scope.options.uploadServiceUrl)+msp.Util.abc+ids+"&magic=true");
                    http.send(form);
                } else {
                    msp.Util.message('Error : your browser does not support HTML5 Drag and Drop');
                }
            }
            else {
                msp.Util.message('Error : this file type is not allowed');
                msp.mask.hide();
            }
        },

        /*
         * Check layerDescription (p) validity and
         * add it to mapshup predefinedLayers if needed
         */
        this.add = function(p, scope) {

            /*
             * Are discarded :
             *  - empty layerDescription
             *  - layerDescription with a "-1" url
             *  - layerDescription with property ignore set to true
             */
            if (!p || (p.hasOwnProperty('url') && p['url'] == -1) || p['ignore']) {
                return false;
            }

            /*
             * Add each 'extras' property to the layerDescription object
             */
            if (typeof p.extras === "object") {
                for (var key in p.extras) {
                    p[key] = p.extras[key];
                }
                delete p.extras;
            }
            
            /*
             * Special case for WPS services
             */
            if (p.type === "WPS" && (msp.Plugins.WPSClient && msp.Plugins.WPSClient._o)) {
                msp.Plugins.WPSClient._o.add(p.url);
                return true
            }
            
            /*
             * Special case for Search service
             */
            if (p.type === "OpenSearch" && (msp.Plugins.Search && msp.Plugins.Search._o)) {
                msp.Plugins.Search._o.add(p.url);
            }
            
            /*
             * Add layer description to predefined layersDescription.
             */
            msp.Map.predefined.add(p);
            
            /*
             * Update layers list and trigger getInfo for this result
             */
            scope.getInfo(p);
            
            return true;

        };
        
        /*
         * Display layer(s) description within popup
         * 
         * @input a : layer description (can be an array or an individual)
         * 
         */
        this.getInfo = function(a) {
            
            var info,
            id,
            lt,
            p,
            ld,
            i,
            l,
            j,
            m,
            self = this;
            
            /*
             * Paranoid mode
             */
            if (typeof a !== "object") {
                return false;
            }
            
            /*
             * Special case for OpenSearch do not show this dialog box
             */
            if (a.type === "OpenSearch") {
                return false;
            }
            
            /*
             * Special case for error
             */
            if (a.type === "error") {
                msp.Util.message(msp.Util._(a.error["message"]));
                return false;
            }
            
            /*
             * If a is not an array, automatically
             * add layer. Else, ask user
             */
            if (!a.length) {
                a = [a];
            }
                
            /*
             * Clear popup body content
             */
            if (self.popup) {
                self.popup.$b.empty();
            }
            
            /*
             * Roll over input array. Should be an array of layerDescription objects
             */
            for (i = 0, l = a.length; i < l; i++) {

                /*
                 * LayerDescription
                 */
                p = a[i];

                /*
                 * Convert p to msp.Map.LayerDescription object
                 */
                ld = new msp.Map.LayerDescription(p, msp.Map);
                
                /*
                 * Get additional parameters if needed
                 * (e.g. getCapabilities for WMS)
                 */
                lt = msp.Map.layerTypes[p.type];

                /*
                 * Process only valid layerTypes
                 */
                if (!lt) {
                    continue;
                }

                /*
                 * Check layerDescription mandatory properties
                 */
                if (!ld.isValid()) {

                    /*
                     * Mandatory poperties are missing => update layerDescription
                     */
                    if ($.isFunction(lt.update)) {
                        lt.update(p, function(a) {
                            self.getInfo(a);
                        });
                        return false;
                    }

                }
                
                /*
                 * If there is only one input layerDescription,
                 * then automatically add it to the map
                 */
                if (l === 1) {
                    msp.Map.addLayer(p);
                    return true;
                }
                
                /*
                 * Layer Description
                 */
                info = ld.getInfo();
                id = msp.Util.getId();
                
                /*
                 * Get info popup
                 */
                if (!self.popup) {

                    /*
                     * Create info popup.
                     * popup reference is removed on popup close
                     */
                    self.popup = new msp.Popup({
                        modal:true,
                        onClose:function(scope){
                            scope.popup = null;
                        },
                        header:'<p>'+msp.Util._("Add layer")+'</p>',
                        scope:self
                    });

                }
            
                /*
                 * Set title and description
                 */
                self.popup.$b.append('<div class="title">'+msp.Util._(p["title"])+'&nbsp;[<a href="#" id="'+id+'" class="hover">'+msp.Util._("Add")+'</a>]</div><div class="description">'+msp.Util._(p["description"] || "No description available")+'</div>');
                
                /*
                 * Add layer on click
                 */
                (function (p, id) {
                    $('#'+id).click(function(){
                        msp.Map.addLayer(p);
                        self.popup.remove();
                    });
                })(p, id);
                
                /*
                 * Roll over layer descrpiption properties
                 */
                for (j = 2, m = info.length; j < m; j++) {

                    /*
                     * Preview special case
                     */
                    if (info[j][0] == "Preview") {
                        self.popup.$b.append('<div class="title">'+msp.Util._(info[j][0])+'</div><div class="description"><img src="'+info[j][1]+'" title=""/></div>');
                    }
                    else {
                        self.popup.$b.append('<div class="title">'+msp.Util._(info[j][0])+'</div><div class="description">'+info[j][1]+'</div>');
                    }
                }
                
                self.popup.$b.append('<br/><br/>');
                
            }
            
            /*
             * Show popup
             */
            self.popup.show();
            
            return true;
        };
        
        /*
         * Set unique instance
         */
        msp.Plugins.AddLayer._o = this;
        
        return this;
        
    };
    
})(window.msp);