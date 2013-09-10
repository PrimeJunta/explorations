define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-construct",
         "dojo/dom-geometry",
         "dojo/dom-class",
         "dojo/dom-style",
         "dojo/on",
         "dijit/_WidgetBase",
         "dijit/layout/ContentPane",
         "./MultiColumnFlowController" ],
function( declare,
          lang,
          domConstruct,
          domGeometry,
          domClass,
          domStyle,
          on,
          _WidgetBase,
          ContentPane,
          MultiColumnFlowController)
{
    return declare([ _WidgetBase ], {
        columns : 2,
        gutter : 30,
        startup : function()
        {
            this.inherited( arguments );
            this._setBox();
            this._events = [];
            this._setupSource();
            this._controller = new MultiColumnFlowController();
            this.flow();
            this._events.push( on( window, "resize", lang.hitch( this, this._waitToResize ) ) );
        },
        flow : function()
        {
            this._setupColumns();
            this._flow();
        },
        _setupSource : function()
        {
            this._sourceNode = domConstruct.create( "div", { style : "z-index:-1;position:absolute;top:0px;left:0px;width:100%;height:100%;visibility:hidden;" }, document.body );
            while( this.domNode.childNodes.length > 0 )
            {
                this._sourceNode.appendChild( this.domNode.removeChild( this.domNode.firstChild ) );
            }
        },
        _setupColumns : function()
        {
            domConstruct.empty( this.domNode );
            this._box = domGeometry.getContentBox( this.domNode );
            var cWidth = ( this._box.w - this.gutter * ( this.columns - 1 ) ) / this.columns;
            this._columnNodes = [];
            for( var i = 0; i < this.columns; i++ )
            {
                var _cc = domConstruct.create( "div", {
                    "class" : "multiColumnContentDiv",
                    "style" : "position:absolute;top:0px;height:100%;left:" + i * ( cWidth + this.gutter ) + "px;width:" + cWidth + "px;"
                }, this.domNode );
                this._columnNodes.push( domConstruct.create( "div", { style : "padding:1px;"}, _cc ) );
            }
        },
        _flow : function()
        {
            this._controller.flow( this._sourceNode, this._columnNodes );
        },
        _waitToResize : function()
        {
            if( this._rto )
            {
                clearTimeout( this._rto );
            }
            this._rto = setTimeout( lang.hitch( this, this.resize ), 100 );
        },
        _setBox : function()
        {
            var _box = domGeometry.getContentBox( this.domNode.parentNode );
            domGeometry.setMarginBox( this.domNode, _box );
        },
        resize : function()
        {
            this._setBox();
            var box = domGeometry.getMarginBox( this.domNode );
            if( !this._box || box.w != this._box.w || box.h != this._box.h )
            {
                this._setupColumns();
                this._flow();
            }
        },
        destroy : function()
        {
            while( this._events.length > 0 )
            {
                this._events.pop().remove();
            }
            this.inherited( arguments );
        }
    });
});