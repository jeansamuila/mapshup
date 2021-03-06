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

/**
 * 
 * Context sharing
 *
 * @param {MapshupObject} M 
 *
 */
(function(M) {
    
    M.Plugins.Share = function() {
        
        /*
         * Only one Share object instance is created
         */
        if (M.Plugins.Share._o) {
            return M.Plugins.Share._o;
        }
        
        /**
         * Last context
         */
        this.last = {};

        /**
         * Initialize plugin
         * 
         * @param {Object} options
         */
        this.init = function(options) {

            var self = this;
            
            /*
             * Init options
             */
            self.options = options || {};

            /*
             * Set options
             * Default toolbar is North West Horizontal
             */
            $.extend(self.options, {
                saveContextServiceUrl:self.options.saveContextServiceUrl || "/plugins/logger/saveContext.php?",
                getContextsServiceUrl:self.options.getContextsServiceUrl || "/plugins/logger/getContexts.php?",
                shareEmbed:M.Util.getPropertyValue(self.options, "shareEmbed", false),
                geocode:M.Util.getPropertyValue(self.options, "geocode", true)
            });

            /*
             * Add share action within header toolbar 
             */
            (new M.Toolbar({
                parent:$('.leftBar', M.$header), 
                classes:'shr',
                items:[
                    {
                        icon:"share.png",
                        tt:"Share",
                        onoff:false,
                        onactivate:function(scope,item) {
                            item.activate(false);
                            self.save(scope);    
                        },
                        scope:self
                    }
                ]
            }));
            
            return self;

        };

        /**
         * Save Context
         * 
         * @param {Object} scope : reference to this object
         */
        this.save = function(scope) {
            
            /*
             * Get map extent
             */
            var p, data, context = JSON.stringify(M.Map.getContext()); // Get serialized context
            
            /*
             * Save context unless it was already saved
             */
            if (context !== scope.last["context"]) {

                /*
                 * Get projected map extend
                 */
                p = M.Map.Util.p2d(M.Map.map.getExtent().clone());
                
                data = {
                    userid:M.Util.getUserInfo().userid, // Get userid
                    context:context,
                    bbox:p.left+","+p.bottom+","+p.right+","+p.top
                };
                
                if (scope.options.geocode) {
                    data.geocode = "";
                }
                
                /*
                 * Save the context on the server
                 *
                 * Method POST is used to avoid "maximum length url" server error
                 * 
                 */
                M.Util.ajax({
                    url:M.Util.getAbsoluteUrl(scope.options.saveContextServiceUrl+M.Util.abc),
                    async:true,
                    dataType:"json",
                    type:"POST",
                    data:data,
                    success: function(data) {
                        if (data.error) {
                            M.Util.message(data.error["message"]);
                        }
                        else {
                            
                            /*
                             * Store context unique identifier
                             */
                            scope.last = {
                                uid:data.result[0].uid,
                                utc:data.result[0].utc,
                                location:data.result[0].location,
                                context:context
                            };
                            
                            /*
                             * Display share popup
                             */
                            scope.share();
                            
                        }

                    }
                },{
                    title:M.Util._("Saving context"),
                    cancel:true
                });

            }
            else {
                scope.share();
            }

        };

        /**
         * Load Context
         * 
         * @param {Object} scope : reference to this object
         */
        this.load = function(scope) {

            /*
             * Retrieve contexts
             */
            M.Util.ajax({
                url:M.Util.proxify(M.Util.getAbsoluteUrl(scope.options.getContextsServiceUrl)+"userid="+M.Util.getUserInfo().userid),
                async:true,
                dataType:"json",
                success: function(data) {

                    /*
                     * Parse result
                     */
                    if (data.error) {
                        M.Util.message(data.error["message"]);
                    }
                    else {

                        /*
                         * Roll over retrieved contexts
                         * contexts[
                         *      {
                         *          context:
                         *          location:
                         *          utc:
                         *          uid:
                         *      },
                         *      ...
                         * ]
                         */
                        var i,
                        l,
                        id,
                        date,
                        time,
                        lastDate = "";

                        for (i = 0, l = data.contexts.length; i < l; i++) {

                            /*
                             * Generate unique id
                             */
                            id = M.Util.getId();

                            /*
                             * Get the date (YYYY-MM-DD) and time (HH:MM) from utc time (10 first characters)
                             */
                            date = data.contexts[i].utc.substring(0,10);
                            time = data.contexts[i].utc.substring(10,16);

                            /*
                             * If the date differs from last stored date (i.e. lastDate)
                             * make it big to have a nice user interface
                             */
                            if (date !== lastDate) {
                                if (i !== 0) {
                                    scope.$d.append('<br/>');
                                }
                                scope.$d.append('<span class="big">'+date+'</span><br/>');
                                lastDate = date;
                            }
                            else {
                                scope.$d.append('<br/>');
                            }
                            id = M.Util.getId();
                            scope.$d.append('&nbsp; <a href="#" id="'+id+'">'+time+' - '+M.Util._(data.contexts[i].location)+'</a>');

                            /*
                             * Add link to load context
                             */
                            (function(scope, div, context) {
                                div.click(function() {

                                    /*
                                     * Load the context
                                     */
                                    M.Map.loadContext(JSON.parse(context.context));

                                    /*
                                     * Set this new context as the last saved/load context
                                     */
                                    scope.last = {
                                        uid:context.uid,
                                        utc:context.utc,
                                        location:context.location,
                                        context:context.context
                                    };

                                });
                            })(scope, $('#'+id), data.contexts[i]);
                        }
                    }

                }
            },{
                title:M.Util._("Contexts retrieving"),
                cancel:true
            });

        };
        
        /*
         * Display share popup
         */
        this.share = function() {
            
            var self = this,
            url = M.Config["general"].rootUrl+M.Config["general"].indexPath+"?uid="+self.last["uid"],
            popup = new M.Popup({
                modal:true,
                header:'<p>'+M.Util._("Share")+' : ' + self.last["location"] + ' - ' + self.last["utc"].substring(0,10) + '</p>',
                body:'<div class="share"><div><a href="#" target="_blank" class="button inline facebook">&nbsp;&nbsp;facebook&nbsp;&nbsp;</a><a href="#" target="_blank" class="button inline twitter">&nbsp;&nbsp;twitter&nbsp;&nbsp;</a><a href="#" class="button inline email">&nbsp;&nbsp;email&nbsp;&nbsp;</a></div></div>'
            });

            /*
             * Share to facebook
             */
            $('.facebook', popup.$b).click(function() {
                $(this).attr('href', 'https://www.facebook.com/sharer.php?u='+encodeURIComponent(url)+'&t='+encodeURIComponent(self.last["location"]));
                return true;
            });
            
            /*
             * Share to twitter
             */
            $('.twitter', popup.$b).click(function() {
                $(this).attr('href', 'http://twitter.com/intent/tweet?status='+encodeURIComponent(self.last["location"] + " - " + url));
                return true;
            });
            
            /*
             * Share by email
             */
            $('.email', popup.$b).click(function() {
                $(this).attr('href', 'mailto:?subject=[mapshup] '+ M.Util._("Look at this map")+'&body='+M.Util._("Take a look at  ")+url);
                return true;
            });

            /*
             * Embed code
             */
            if (self.options.shareEmbed) {
                $('.share', popup.$b).append('<div class="embed"><h1>'+M.Util._("Embed code in your website")+'</h1><textarea rows="4" class="code"></textarea></div>');
                $('.code', popup.$b).val('<iframe width="1024" height="600" frameBorder="0" src="'+url+'"></iframe>');
            }
            
            popup.show();

        };
        
        /*
         * Set unique instance
         */
        M.Plugins.Share._o = this;
        
        return this;
        
    };
    
})(window.M);
