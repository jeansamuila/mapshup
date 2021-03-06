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
 * Help plugin
 *
 * Display help info on top of the map
 *
 * @param {MapshupObject} M
 * 
 */
(function(M) {

    M.Plugins.Help = function() {

        /*
         * Only one Help object instance is created
         */
        if (M.Plugins.Help._o) {
            return M.Plugins.Help._o;
        }

        /*
         * Initialization
         */
        this.init = function(options) {

            var c, i, l, id = M.Util.getId(), self = this;

            /*
             * init options
             */
            self.options = options || {};
            self.options.rootUrl = self.options.rootUrl || M.Config["general"].rootUrl + "/js/mapshup/i18n";

            /*
             * Create the help container over everything else
             */
            self.$d = M.Util.$$('#' + M.Util.getId(), $('#mapshup')).addClass("overall help").hide();

            /*
             * Register action within header
             */
            self.tb = new M.Toolbar({
                parent: $('.leftBar', M.$header),
                classes: 'shr',
                items: [
                    {
                        id: id,
                        icon: "help.png",
                        tt: "Help",
                        onoff: true,
                        scope: self,
                        onactivate: function(scope) {
                            scope.show();
                        },
                        ondeactivate: function(scope) {
                            scope.hide();
                        }
                    }
                ]
            });

            /*
             * Add a close button to the Help panel
             */
            M.Util.addClose(self.$d, function(e) {
                self.tb.activate(id, false);
            });

            /*
             * Append logo bottom right
             */
            if (!options.noLogo) {
                self.$d.append('<div style="position:absolute;bottom:30px;right:30px;opacity:0.2"><a href="http://mapshup.info" title="Powered with mapshup" target="_blank"><img src="./img/mapshuplogobig.png"/></a></div>');
            }

            /*
             * Retrieve Help file depending on lang
             */
            $.ajax({
                url: M.Util.proxify(self.options.rootUrl + '/help_' + M.Config["i18n"].lang + '.json'),
                async: true,
                dataType: "json",
                success: function(json) {
                    
                    /*
                     * Add help items defined in the config file
                     */
                    if (json && json.items) {
                        for (var i = 0, l = json.items.length; i < l; i++) {
                            self.add(json.items[i]);
                        }
                    }
                
                }
            });

            return self;

        };

        /*
         * Add a help block
         */
        this.add = function(item) {

            /*
             * Paranoid mode
             */
            item = item || {};

            this.$d.append('<div class="item" style="max-width:' + (item.maxWidth ? item.maxWidth : '350px') + '">' + item.html + '</div>').children().last().css(item.position);

        };

        /*
         * Show help panel
         */
        this.show = function() {
            this.$d.show();
        };

        /*
         * Hide help panel
         */
        this.hide = function() {
            this.$d.hide();
        };

        /*
         * Set unique instance
         */
        M.Plugins.Help._o = this;

        return this;
    };
})(window.M);